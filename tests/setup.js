// tests/setup.js
import { jest } from '@jest/globals';

// Base de “clases” en memoria para simular Prisma
const classesDb = [
  {
    id: 1,
    name: 'Yoga',
    description: 'Clase de yoga',
    date: new Date(),
    time: '10:00',
    capacity: 10,
    enrolled: 0,
    createdById: 'admin_1',
    users: []
  }
];

// Mock de PrismaClient
jest.unstable_mockModule('@prisma/client', () => {
  class PrismaClient {
    class = {
      findUnique: async ({ where: { id } }) =>
        classesDb.find(c => c.id === id) || null,

      findMany: async (args = {}) => {
        const hasUser = args?.where?.users?.has;
        if (hasUser) {
          return classesDb.filter(c => c.users.includes(args.where.users.has));
        }
        return classesDb;
      },

      update: async ({ where: { id }, data }) => {
        const idx = classesDb.findIndex(c => c.id === id);
        if (idx === -1) throw new Error('Class not found');

        const current = classesDb[idx];

        // manejar increment/decrement de enrolled
        let enrolled = current.enrolled;
        if (data.enrolled?.increment) {
          enrolled = current.enrolled + data.enrolled.increment;
        }
        if (data.enrolled?.decrement) {
          enrolled = current.enrolled - data.enrolled.decrement;
        }

        // manejar users.push o reemplazo completo
        let users = current.users;

        // CASO 1: objeto tipo { push: 'user_123' }
        if (
          data.users &&
          !Array.isArray(data.users) &&
          typeof data.users === 'object' &&
          Object.prototype.hasOwnProperty.call(data.users, 'push')
        ) {
          users = [...users, data.users.push];
        }
        // CASO 2: reemplazo completo con un array (e.g. newUsers en /unenroll)
        else if (Array.isArray(data.users)) {
          users = data.users;
        }

        const updated = { ...current, ...data, enrolled, users };
        classesDb[idx] = updated;
        return updated;
      }
    };
  }

  return { PrismaClient };
});

// Mock de Clerk: siempre “logueado” como user_123 con rol "user"
jest.unstable_mockModule('@clerk/express', () => {
  return {
    clerkMiddleware: () => (req, _res, next) => {
      req.auth = { userId: 'user_123' };
      next();
    },
    clerkClient: {
      users: {
        getUser: async () => ({ publicMetadata: { role: 'user' } })
      }
    },
    verifyWebhook: async () => ({ type: 'user.created', data: { id: 'user_123' } })
  };
});

// ¡IMPORTANTE! Importar app *después* de mockear módulos
const { default: app } = await import('../src/app.js');

export { app, classesDb };
