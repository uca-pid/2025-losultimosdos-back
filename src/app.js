import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkClient, clerkMiddleware } from '@clerk/express';
import { verifyWebhook } from '@clerk/express/webhooks';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.post('/api/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const evt = await verifyWebhook(req);
    const eventType = evt.type;

    if (eventType === 'user.created') {
      const { id } = evt.data;
      try {
        await clerkClient.users.updateUser(id, {
          publicMetadata: { role: 'user' }
        });
        console.log(`User ${id} assigned role: user`);
        return res.status(200).json({ success: true, message: 'Role assigned successfully' });
      } catch (error) {
        console.error(`Error assigning role to user ${id}:`, error);
        return res.status(500).json({ success: false, message: 'Failed to assign role' });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return res.status(400).send('Error verifying webhook');
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());

// Import routes
import adminRoutes from './routes/admin/index.js';
import userRoutes from './routes/user/index.js';

// Register routes
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/classes', async (req, res) => {
  const classes = await prisma.class.findMany();
  res.json({ classes });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
