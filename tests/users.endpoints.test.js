import request from 'supertest';
import { app, classesDb } from './setup.js';

describe('User endpoints', () => {
  beforeEach(() => {
    classesDb.length = 0;
    classesDb.push({
      id: 1,
      name: 'Yoga',
      description: 'Clase de yoga',
      date: new Date(),
      time: '10:00',
      capacity: 10,
      enrolled: 0,
      createdById: 'admin_1',
      users: []
    });
  });

  test('GET /health responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /classes devuelve lista', async () => {
    const res = await request(app).get('/classes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.classes)).toBe(true);
    expect(res.body.classes[0].name).toBe('Yoga');
  });

  test('POST /user/enroll inscribe al usuario', async () => {
    const res = await request(app)
      .post('/user/enroll')
      .send({ classId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Enrolled successfully');
    expect(res.body.class.enrolled).toBe(1);
    expect(res.body.class.users).toContain('user_123');
  });

  test('POST /user/enroll falla si ya está inscripto', async () => {
    await request(app).post('/user/enroll').send({ classId: 1 });
    const res = await request(app).post('/user/enroll').send({ classId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Already enrolled/i);
  });

  test('POST /user/unenroll da de baja al usuario', async () => {
    await request(app).post('/user/enroll').send({ classId: 1 });
    const res = await request(app).post('/user/unenroll').send({ classId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Unenrolled successfully');
    expect(res.body.class.enrolled).toBe(0);
    expect(res.body.class.users).not.toContain('user_123');
  });

  test('GET /user/my-classes devuelve las clases del usuario', async () => {
    await request(app).post('/user/enroll').send({ classId: 1 });
    const res = await request(app).get('/user/my-classes');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.classes)).toBe(true);
    expect(res.body.classes.length).toBe(1);
    expect(res.body.classes[0].id).toBe(1);
  });

  test('POST /user/enroll valida classId requerido', async () => {
    const res = await request(app).post('/user/enroll').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/classId is required/i);
  });

  test('POST /user/unenroll valida classId requerido', async () => {
    const res = await request(app).post('/user/unenroll').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/classId is required/i);
  });

  test('POST /user/enroll 404 si la clase no existe', async () => {
    const res = await request(app).post('/user/enroll').send({ classId: 999 });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Class not found/i);
  });
});
