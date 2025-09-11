const express = require('express');
const cors = require('cors');
const { PrismaClient, Role } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// --- CORS ---
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,
}));
app.options('*', cors());

app.use(express.json());

// ---------- Helpers ----------
function authMiddleware(req, _res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const token = auth.slice(7);
      req.user = jwt.verify(token, JWT_SECRET); // { userId, role, iat, exp }
    } catch {}
  }
  next();
}
app.use(authMiddleware);

// ---------- Rutas ----------
app.get('/', (_req, res) => res.send('Backend is running!'));

// --- Auth ---
app.post('/api/signup', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (!Object.values(Role).includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already registered.' });

    // TODO: en producción, usar bcrypt.hash(...)
    const user = await prisma.user.create({
      data: { email, password, fullName: name, role },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ role: user.role, token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Signup failed.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // TODO: en producción, usar bcrypt.compare(...)
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ role: user.role, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed.' });
  }
});

// --- Classes ---
// GET /api/classes -> solo futuras
app.get('/api/classes', async (_req, res) => {
  try {
    const now = new Date();
    const classes = await prisma.class.findMany({
      where: { hour: { gt: now } }, // solo clases futuras
      include: { _count: { select: { reservations: true } } },
      orderBy: { hour: 'asc' },
    });
    const payload = classes.map(c => ({
      id: c.id,
      name: c.name,
      datetime: c.hour.toISOString(),
      capacity: c.spacesAvailable,
      booked: c._count.reservations,
    }));
    res.json(payload);
  } catch (err) {
    console.error('Get /api/classes error:', err);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

// POST /api/classes -> validar fecha futura
app.post('/api/classes', async (req, res) => {
  const { name, datetime, capacity, description = '', createdById } = req.body;
  if (!name || !datetime || !capacity || !createdById) {
    return res.status(400).json({ message: 'Missing fields (name, datetime, capacity, createdById required)' });
  }

  // Validaciones de negocio
  const start = new Date(datetime); // viene de <input type="datetime-local">
  if (isNaN(start.getTime())) {
    return res.status(400).json({ message: 'Invalid datetime' });
  }
  const MIN_LEAD_MINUTES = 1;
  const nowPlusLead = Date.now() + MIN_LEAD_MINUTES * 60 * 1000;
  if (start.getTime() <= nowPlusLead) {
    return res.status(400).json({ message: `Class must be scheduled at least ${MIN_LEAD_MINUTES} minute(s) in the future` });
  }
  const cap = Number(capacity);
  if (!Number.isInteger(cap) || cap < 1) {
    return res.status(400).json({ message: 'Capacity must be a positive integer' });
  }

  try {
    // (opcional) validar admin
    const creator = await prisma.user.findUnique({ where: { id: Number(createdById) } });
    if (!creator) return res.status(404).json({ message: 'Creator user not found' });
    if (creator.role !== 'admin') return res.status(403).json({ message: 'Only admin can create classes' });

    const cls = await prisma.class.create({
      data: {
        name,
        description,
        hour: start,
        spacesAvailable: cap,
        createdById: Number(createdById),
      },
    });
    res.status(201).json(cls);
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ message: 'Error creating class' });
  }
});

// --- Bookings ---
// POST /api/bookings { user_id, class_id } -> valida no pasado y cupo
app.post('/api/bookings', async (req, res) => {
  const { user_id, class_id } = req.body;
  if (!user_id || !class_id) {
    return res.status(400).json({ message: 'Missing fields (user_id, class_id)' });
  }
  try {
    const cls = await prisma.class.findUnique({
      where: { id: Number(class_id) },
      include: { _count: { select: { reservations: true } } },
    });
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    // No permitir reservar si ya pasó (mismo margen)
    const MIN_LEAD_MINUTES = 1;
    const nowPlusLead = Date.now() + MIN_LEAD_MINUTES * 60 * 1000;
    if (cls.hour.getTime() <= nowPlusLead) {
      return res.status(409).json({ message: 'Class already started or finished' });
    }

    const currentBooked = cls._count.reservations;
    if (currentBooked >= cls.spacesAvailable) {
      return res.status(409).json({ message: 'Class full' });
    }

    // Evitar doble reserva del mismo user
    const already = await prisma.reservation.findFirst({
      where: { userId: Number(user_id), classId: Number(class_id) },
    });
    if (already) return res.status(409).json({ message: 'User already booked this class' });

    await prisma.reservation.create({
      data: { userId: Number(user_id), classId: Number(class_id) },
    });

    res.status(201).json({ message: 'Booked' });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ message: 'Booking failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// GET /api/admin/classes
// Devuelve las clases del admin autenticado (creadas por él)
// Query opcional: ?includePast=true para incluir pasadas
app.get('/api/admin/classes', async (req, res) => {
  try {
    // requiere JWT (ya parseado en authMiddleware)
    const user = req.user;
    if (!user || !user.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const includePast = String(req.query.includePast || 'false').toLowerCase() === 'true';
    const whereClause = {
      createdById: Number(user.userId),
      ...(includePast ? {} : { hour: { gt: new Date() } }),
    };

    const classes = await prisma.class.findMany({
      where: whereClause,
      include: { _count: { select: { reservations: true } } },
      orderBy: { hour: 'asc' },
    });

    const payload = classes.map(c => ({
      id: c.id,
      name: c.name,
      datetime: c.hour.toISOString(),
      capacity: c.spacesAvailable,
      booked: c._count.reservations,
      description: c.description,
    }));

    res.json(payload);
  } catch (err) {
    console.error('Get /api/admin/classes error:', err);
    res.status(500).json({ message: 'Failed to fetch admin classes' });
  }
});
app.get('/api/me', async (req, res) => {
  try {
    const u = req.user; // viene del authMiddleware
    if (!u || !u.userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await prisma.user.findUnique({
      where: { id: Number(u.userId) },
      select: { id: true, email: true, fullName: true, role: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('GET /api/me error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// PATCH /api/me -> actualizar perfil (fullName, email; cambio de password opcional)
app.patch('/api/me', async (req, res) => {
  try {
    const u = req.user;
    if (!u || !u.userId) return res.status(401).json({ message: 'Unauthorized' });

    const { fullName, email, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: Number(u.userId) } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Validar email único si cambia
    if (email && email !== user.email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return res.status(409).json({ message: 'Email already in use' });
    }

    const data = {};
    if (typeof fullName === 'string' && fullName.trim()) data.fullName = fullName.trim();
    if (typeof email === 'string' && email.trim()) data.email = email.trim();

    // Cambio de password (en prod: usar bcrypt.compare/hash)
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
      if (currentPassword !== user.password) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }
      data.password = String(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: Number(u.userId) },
      data,
      select: { id: true, email: true, fullName: true, role: true },
    });

    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    console.error('PATCH /api/me error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});
// === Mis reservas (usuario autenticado) ===
// GET /api/my/reservations?includePast=true|false
app.get('/api/my/reservations', async (req, res) => {
  try {
    const u = req.user;
    if (!u || !u.userId) return res.status(401).json({ message: 'Unauthorized' });

    const includePast = String(req.query.includePast || 'false').toLowerCase() === 'true';
    const where = {
      userId: Number(u.userId),
      ...(includePast ? {} : { class: { hour: { gt: new Date() } } }),
    };

    const reservations = await prisma.reservation.findMany({
      where,
      include: { class: true },
      orderBy: { class: { hour: 'asc' } },
    });

    const payload = reservations.map(r => ({
      id: r.id,                        // reservation id
      classId: r.classId,
      name: r.class.name,
      datetime: r.class.hour.toISOString(),
    }));

    res.json(payload);
  } catch (err) {
    console.error('GET /api/my/reservations error:', err);
    res.status(500).json({ message: 'Failed to fetch reservations' });
  }
});

// === Cancelar una reserva ===
// DELETE /api/bookings/:id
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const u = req.user;
    if (!u || !u.userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid reservation id' });

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { class: true },
    });
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (reservation.userId !== Number(u.userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Evitar cancelar si la clase ya pasó (mismo margen que usamos al reservar)
    const MIN_LEAD_MINUTES = 1;
    const nowPlusLead = Date.now() + MIN_LEAD_MINUTES * 60 * 1000;
    if (reservation.class.hour.getTime() <= nowPlusLead) {
      return res.status(409).json({ message: 'Class already started or finished' });
    }

    await prisma.reservation.delete({ where: { id } });
    res.json({ message: 'Reservation cancelled' });
  } catch (err) {
    console.error('DELETE /api/bookings/:id error:', err);
    res.status(500).json({ message: 'Failed to cancel reservation' });
  }
});
