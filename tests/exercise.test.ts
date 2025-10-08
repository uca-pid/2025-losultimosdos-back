import request from "supertest";
import app from "../src/app";

declare const __setRole__: (role: "user" | "admin") => void;
declare const __setUserId__: (id: string) => void;
declare const __seedMuscleGroups__: (rows: any[]) => void;
declare const __seedExercises__: (rows: any[]) => void;
declare const __resetExercises__: () => void;
declare const __resetMuscleGroups__: () => void;

const BASE = "/admin/exercises";

describe("Admin • exercises (create/update/delete & list shape)", () => {
  beforeEach(() => {
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
  });

  describe(`GET /exercises`, () => {
    test("devuelve todos los ejercicios (shape admin { total, items })", async () => {
      const res = await request(app).get("/exercises");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          items: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              name: "Press de banca",
              muscleGroupId: 1,
            }),
            expect.objectContaining({
              id: 2,
              name: "Jalones al Pecho",
              muscleGroupId: 2,
            }),
          ]),
        })
      );
    });
  });

  describe(`POST ${BASE}`, () => {
    test("crea un ejercicio", async () => {
      const res = await request(app)
        .post(BASE)
        .send({ name: "Press de banca 3", muscleGroupId: 1 });
      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Exercise created",
          exercise: expect.objectContaining({
            id: expect.any(Number),
            name: "Press de banca 3",
            muscleGroupId: 1,
          }),
        })
      );
    });
  });

  describe(`PUT ${BASE}/:id`, () => {
    test("actualiza un ejercicio", async () => {
      const res = await request(app)
        .put(`${BASE}/1`)
        .send({ name: "Press de banca 2" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "Exercise updated",
        exercise: { id: 1, name: "Press de banca 2", muscleGroupId: 1 },
      });
    });
  });

  describe(`DELETE ${BASE}/:id`, () => {
    test("elimina un ejercicio", async () => {
      const res = await request(app).delete(`${BASE}/1`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Exercise deleted" });
    });
  });
});
