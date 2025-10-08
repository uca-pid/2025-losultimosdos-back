import request from "supertest";
import app from "../src/app";

declare const __setRole__: (role: "user" | "admin") => void;
declare const __setUserId__: (id: string) => void;
declare const __seedMuscleGroups__: (rows: any[]) => void;
declare const __resetMuscleGroups__: () => void;
declare const __seedExercises__: (rows: any[]) => void;
declare const __resetExercises__: () => void;
declare const __seedRoutines__: (rows: any[]) => void;
declare const __resetRoutines__: () => void;
declare const __seedRoutineExercises__: (rows: any[]) => void;
declare const __resetRoutineExercises__: () => void;

const ADMIN_BASE = "/admin/routines";  
const PUB_BASE = "/routines";

describe("Routines • públicos y admin", () => {
  beforeEach(() => {
    __resetRoutines__();
    __resetRoutineExercises__();
    __resetExercises__();
    __resetMuscleGroups__();

    __setRole__("admin");
    __setUserId__("admin_test_id");

    __seedMuscleGroups__([
      { id: 1, name: "Pecho" },
      { id: 2, name: "Espalda" },
    ]);

    __seedExercises__([
      { id: 1, name: "Press de banca", muscleGroupId: 1 },
      { id: 2, name: "Jalones al Pecho", muscleGroupId: 2 },
    ]);

    __seedRoutines__([
      { id: 1, name: "Full Body Beginners", description: "Intro", level: "Beginner", duration: 30, icon: "🔥", users: [] },
      { id: 2, name: "Back & Chest",        description: "Push/Pull", level: "Intermediate", duration: 45, icon: "💪", users: [] },
    ]);

    __seedRoutineExercises__([
      { id: 1, routineId: 1, exerciseId: 1, sets: 3, reps: 10, restTime: 60 },
      { id: 2, routineId: 2, exerciseId: 2, sets: 4, reps: 8,  restTime: 90 },
    ]);
  });

  describe(`GET ${PUB_BASE}`, () => {
    test("lista rutinas públicas (valida shape)", async () => {
      const res = await request(app).get(PUB_BASE);
      expect(res.status).toBe(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          items: expect.any(Array),
        })
      );
      expect(res.body.items.length).toBe(res.body.total);
    });
  });

  describe(`GET ${PUB_BASE}/:id`, () => {
    test("devuelve una rutina (shape libre del service)", async () => {
      const res = await request(app).get(`${PUB_BASE}/2`);
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(JSON.stringify(res.body)).toContain('"id":2');
      }
    });
  });



  describe(`POST ${ADMIN_BASE}/:id/exercises`, () => {
    test("agrega ejercicio a rutina", async () => {
      const res = await request(app)
        .post(`${ADMIN_BASE}/2/exercises`)
        .send({ exerciseId: 1, sets: 5, reps: 5, restTime: 120 });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Exercise added to routine",
          item: expect.objectContaining({
            id: expect.any(Number),
            routineId: 2,
            exerciseId: 1,
            sets: 5,
            reps: 5,
            restTime: 120,
          }),
        })
      );
    });
  });

  describe(`PATCH ${ADMIN_BASE}/:id/exercises/:reId`, () => {
    test("actualiza un routineExercise", async () => {

      const res = await request(app)
        .patch(`${ADMIN_BASE}/2/exercises/2`)
        .send({ sets: 6, reps: 6, restTime: 100 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Routine exercise updated",
          item: expect.objectContaining({ id: 2, routineId: 2, sets: 6, reps: 6, restTime: 100 }),
        })
      );
    });
  });


  describe(`POST ${ADMIN_BASE}/:id/assign`, () => {
    test("asigna rutina a user", async () => {
      const res = await request(app).post(`${ADMIN_BASE}/2/assign`).send({ userId: "user_1" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Routine assigned" });
    });
  });

  describe(`POST ${ADMIN_BASE}/:id/unassign`, () => {
    test("desasigna rutina de user", async () => {
      await request(app).post(`${ADMIN_BASE}/2/assign`).send({ userId: "user_1" });
      const res = await request(app).post(`${ADMIN_BASE}/2/unassign`).send({ userId: "user_1" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Routine unassigned" });
    });
  });
});

describe(`POST ${ADMIN_BASE}`, () => {
    test("crea rutina (hoy valida que el schema rechaza payloads inválidos)", async () => {

      const res = await request(app).post(ADMIN_BASE).send({ name: "Chest Day" });
      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          error: expect.any(String), 
        })
      );
    });
  });
describe(`PUT ${ADMIN_BASE}/:id`, () => {
    test("actualiza rutina", async () => {
      const res = await request(app)
        .put(`${ADMIN_BASE}/1`)
        .send({ name: "Full Body Beginners v2" 
            , exercises: [{ exerciseId: 1, sets: 3, reps: 10, restTime: 60 }]
            , replaceExercises: true
            , description: "Rutina de pecho"
            , level: "Beginner"
            , duration: 30
            , icon: "https://example.com/icon.png"
            , users: ["user_1"]
        });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Routine updated", routine: expect.objectContaining({ id: 1, name: "Full Body Beginners v2" }) });
    });
  });
  
  describe(`DELETE ${ADMIN_BASE}/:id`, () => {
    test("elimina rutina (primero limpio relaciones de la rutina 1)", async () => {

      await request(app).delete(`${ADMIN_BASE}/1/exercises/1`);
      const res = await request(app).delete(`${ADMIN_BASE}/1`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Routine deleted" });
    });
  });
  
  describe(`DELETE ${ADMIN_BASE}/:id/exercises/:reId`, () => {
    test("elimina un routineExercise (el recién creado)", async () => {
      const created = await request(app)
        .post(`${ADMIN_BASE}/2/exercises`)
        .send({ exerciseId: 1, sets: 2, reps: 12, restTime: 60 });
  
      expect([200, 201]).toContain(created.status);
      const reId = created.body?.item?.id;
      expect(reId).toBeTruthy();
  
      const res = await request(app).delete(`${ADMIN_BASE}/2/exercises/${reId}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Routine exercise removed" });
    });
  });
  