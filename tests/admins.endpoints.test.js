import request from 'supertest';
import { jest } from '@jest/globals';
async function makeAppWithRole(role = 'admin', seed = []) {
  jest.resetModules();
  const classesDb = seed.map(c => ({ ...c }));
  await jest.unstable_mockModule('@prisma/client', () => {
    let nextId = classesDb.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1;

    class PrismaClient {
      class = {
        create: async ({ data }) => {
          const row = {
            id: nextId++,
            name: data.name,
            description: data.description,
            date: new Date(data.date),
            time: data.time,
            capacity: data.capacity,
            enrolled: data.enrolled ?? 0,
            createdById: data.createdById,
            users: Array.isArray(data.users)
              ? data.users
              : data.users
              ? [data.users]
              : []
          };
          classesDb.push(row);
          return { ...row };
        },

        update: async ({ where: { id }, data }) => {
          const idx = classesDb.findIndex(c => c.id === id);
          if (idx === -1) throw Object.assign(new Error('Class not found'), { code: 'P2025' });

          const current = classesDb[idx];
          let enrolled = current.enrolled;
          if (data.enrolled?.increment) enrolled = current.enrolled + data.enrolled.increment;
          if (data.enrolled?.decrement) enrolled = current.enrolled - data.enrolled.decrement;
          let users = current.users;
          if (
            data.users &&
            !Array.isArray(data.users) &&
            typeof data.users === 'object' &&
            Object.prototype.hasOwnProperty.call(data.users, 'push')
          ) {
            users = [...users, data.users.push];
          } else if (Array.isArray(data.users)) {
            users = data.users;
          }

          const updated = {
            ...current,
            ...data,
            ...(data.date ? { date: new Date(data.date) } : {}),
            ...(data.time ? { time: data.time } : {}),
            ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
            enrolled,
            users
          };

          classesDb[idx] = updated;
          return { ...updated };
        },

        delete: async ({ where: { id } }) => {
          const idx = classesDb.findIndex(c => c.id === id);
          if (idx === -1) throw Object.assign(new Error('Class not found'), { code: 'P2025' });
          const deleted = classesDb.splice(idx, 1)[0];
          return { ...deleted };
        },

        findUnique: async ({ where: { id } }) => classesDb.find(c => c.id === id) || null,

        findMany: async (args = {}) => {
          const hasUser = args?.where?.users?.has;
          if (hasUser) {
            return classesDb.filter(c => c.users.includes(args.where.users.has));
          }
          return classesDb.map(c => ({ ...c }));
        }
      };
    }

    return { PrismaClient };
  });

  await jest.unstable_mockModule('@clerk/express', () => {
    return {
      clerkMiddleware: () => (req, _res, next) => {
        req.auth = { userId: 'user_admin_test' };
        next();
      },
      clerkClient: {
        users: {
          getUser: async () => ({ publicMetadata: { role } })
        }
      },
      verifyWebhook: async () => ({ type: 'user.created', data: { id: 'user_admin_test' } })
    };
  });
  const { default: app } = await import('../src/app.js');

  return { app, db: classesDb };
}

describe('Admin endpoints', () => {
  test('GET /admin devuelve dashboard con rol admin', async () => {
    const { app } = await makeAppWithRole('admin');
    const res = await request(app).get('/admin');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Admin dashboard');
  });

  test('GET /admin rechaza con 403 si rol no es admin', async () => {
    const { app } = await makeAppWithRole('user');
    const res = await request(app).get('/admin');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  test('POST /admin/class valida campos requeridos', async () => {
    const { app } = await makeAppWithRole('admin');
    const res = await request(app).post('/admin/class').send({
      name: 'Funcional'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/i);
  });

  test('POST /admin/class crea una clase', async () => {
    const { app, db } = await makeAppWithRole('admin');

    const payload = {
      name: 'Spinning',
      description: 'Clase de spinning intensa',
      date: '2026-01-15T10:00:00.000Z',
      time: '10:00',
      capacity: 20
    };

    const res = await request(app).post('/admin/class').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Class created successfully');
    expect(res.body.class.id).toBeDefined();
    expect(res.body.class.name).toBe('Spinning');
    expect(db.length).toBe(1);
    expect(db[0].name).toBe('Spinning');
  });

  test('PUT /admin/class/:id actualiza una clase existente', async () => {
    const seed = [
      {
        id: 1,
        name: 'Yoga',
        description: 'Basico',
        date: new Date('2026-01-01T12:00:00.000Z'),
        time: '12:00',
        capacity: 10,
        enrolled: 0,
        createdById: 'admin_1',
        users: []
      }
    ];
    const { app } = await makeAppWithRole('admin', seed);

    const res = await request(app)
      .put('/admin/class/1')
      .send({
        name: 'Yoga Avanzado',
        description: 'Con posturas avanzadas',
        date: '2026-01-02T12:00:00.000Z',
        time: '12:30',
        capacity: 15
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Class updated successfully');
    expect(res.body.class.name).toBe('Yoga Avanzado');
    expect(res.body.class.capacity).toBe(15);
  });

  test('PUT /admin/class/:id 404 si no existe', async () => {
    const { app } = await makeAppWithRole('admin', []);
    const res = await request(app)
      .put('/admin/class/999')
      .send({
        name: 'X',
        description: 'Y',
        date: '2026-01-02T12:00:00.000Z',
        time: '12:30',
        capacity: 15
      });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Class not found/i);
  });

  test('DELETE /admin/class/:id elimina una clase', async () => {
    const seed = [
      {
        id: 1,
        name: 'Crossfit',
        description: 'Alta intensidad',
        date: new Date('2026-02-01T10:00:00.000Z'),
        time: '10:00',
        capacity: 12,
        enrolled: 0,
        createdById: 'admin_1',
        users: []
      }
    ];
    const { app } = await makeAppWithRole('admin', seed);

    const res = await request(app).delete('/admin/class/1');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Class deleted successfully');
    const list = await request(app).get('/classes');
    expect(list.status).toBe(200);
    expect(list.body.classes).toHaveLength(0);
  });

  test('DELETE /admin/class/:id 404 si no existe', async () => {
    const { app } = await makeAppWithRole('admin', []);
    const res = await request(app).delete('/admin/class/12345');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Class not found/i);
  });
});
