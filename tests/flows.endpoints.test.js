// tests/flows.endpoints.test.js
import request from 'supertest';
import { jest } from '@jest/globals';

async function makeAppsShared(seed = []) {
  const classesDb = seed.map(c => ({ ...c }));
  const mockPrismaWithDb = async () => {
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
  };
  jest.resetModules();
  await mockPrismaWithDb();
  await jest.unstable_mockModule('@clerk/express', () => {
    return {
      clerkMiddleware: () => (req, _res, next) => {
        req.auth = { userId: 'admin_user' };
        next();
      },
      clerkClient: {
        users: {
          getUser: async () => ({ publicMetadata: { role: 'admin' } })
        }
      },
      verifyWebhook: async () => ({ type: 'user.created', data: { id: 'admin_user' } })
    };
  });
  const { default: appAdmin } = await import('../src/app.js');
  jest.resetModules();
  await mockPrismaWithDb(); // vuelve a exponer PrismaClient pero con CIERRE a la misma classesDb
  await jest.unstable_mockModule('@clerk/express', () => {
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
  const { default: appUser } = await import('../src/app.js');

  return { appAdmin, appUser, db: classesDb };
}

describe('Flujos combinados admin + user (DB compartida)', () => {
  test('Crear -> Listar -> Enroll -> My-classes (consistencia de punta a punta)', async () => {
    const { appAdmin, appUser } = await makeAppsShared([]);

    // Crear
    const create = await request(appAdmin).post('/admin/class').send({
      name: 'Funcional',
      description: 'Circuitos',
      date: '2026-01-01T10:00:00.000Z',
      time: '10:00',
      capacity: 10
    });
    expect(create.status).toBe(200);
    const id = create.body.class.id;
    const list = await request(appUser).get('/classes');
    expect(list.status).toBe(200);
    expect(list.body.classes.some(c => c.id === id)).toBe(true);
    const enroll = await request(appUser).post('/user/enroll').send({ classId: id });
    expect(enroll.status).toBe(200);
    const mine = await request(appUser).get('/user/my-classes');
    expect(mine.status).toBe(200);
    expect(mine.body.classes.some(c => c.id === id)).toBe(true);
  });

  test('Enroll -> Update (no pisa users/enrolled)', async () => {
    const { appAdmin, appUser } = await makeAppsShared([]);

    const created = await request(appAdmin).post('/admin/class').send({
      name: 'Spinning',
      description: 'Alta intensidad',
      date: '2026-01-10T10:00:00.000Z',
      time: '10:00',
      capacity: 12
    });
    const id = created.body.class.id;
    await request(appUser).post('/user/enroll').send({ classId: id });
    const upd = await request(appAdmin).put(`/admin/class/${id}`).send({
      name: 'Spinning Avanzado',
      description: 'Nivel 2',
      date: '2026-01-10T11:00:00.000Z',
      time: '11:00',
      capacity: 15
    });
    expect(upd.status).toBe(200);
    expect(upd.body.class.users).toContain('user_123');
    expect(upd.body.class.enrolled).toBe(1);
  });

  test('Enroll -> Delete -> Re-enroll (404 tras borrar)', async () => {
    const { appAdmin, appUser } = await makeAppsShared([]);

    const created = await request(appAdmin).post('/admin/class').send({
      name: 'Yoga',
      description: 'Básico',
      date: '2026-02-01T12:00:00.000Z',
      time: '12:00',
      capacity: 10
    });
    const id = created.body.class.id;

    await request(appUser).post('/user/enroll').send({ classId: id });

    const del = await request(appAdmin).delete(`/admin/class/${id}`);
    expect(del.status).toBe(200);

    const again = await request(appUser).post('/user/enroll').send({ classId: id });
    expect(again.status).toBe(404);
  });

  test('Crear 2 clases -> Enroll en A -> Update B -> My-classes no cambia', async () => {
    const { appAdmin, appUser } = await makeAppsShared([]);

    const a = await request(appAdmin).post('/admin/class').send({
      name: 'A',
      description: 'aaa',
      date: '2026-03-01T09:00:00.000Z',
      time: '09:00',
      capacity: 10
    });
    const idA = a.body.class.id;

    const b = await request(appAdmin).post('/admin/class').send({
      name: 'B',
      description: 'bbb',
      date: '2026-03-02T09:00:00.000Z',
      time: '09:00',
      capacity: 10
    });
    const idB = b.body.class.id;

    await request(appUser).post('/user/enroll').send({ classId: idA });

    const mineBefore = await request(appUser).get('/user/my-classes');
    expect(mineBefore.body.classes.map(c => c.id)).toEqual([idA]);

    const updB = await request(appAdmin).put(`/admin/class/${idB}`).send({
      name: 'B2',
      description: 'bbb-2',
      date: '2026-03-02T10:00:00.000Z',
      time: '10:00',
      capacity: 12
    });
    expect(updB.status).toBe(200);

    const mineAfter = await request(appUser).get('/user/my-classes');
    expect(mineAfter.body.classes.map(c => c.id)).toEqual([idA]); // no cambió
  });

  test('Enroll -> Unenroll -> Enroll (reinscripción sin duplicados)', async () => {
    const { appAdmin, appUser } = await makeAppsShared([]);

    const created = await request(appAdmin).post('/admin/class').send({
      name: 'Crossfit',
      description: 'RX',
      date: '2026-04-01T10:00:00.000Z',
      time: '10:00',
      capacity: 8
    });
    const id = created.body.class.id;

    await request(appUser).post('/user/enroll').send({ classId: id });
    await request(appUser).post('/user/unenroll').send({ classId: id });

    const again = await request(appUser).post('/user/enroll').send({ classId: id });
    expect(again.status).toBe(200);

    const usersArr = again.body.class.users.filter(u => u === 'user_123');
    expect(usersArr.length).toBe(1); 
    expect(again.body.class.enrolled).toBe(1);
  });
});
