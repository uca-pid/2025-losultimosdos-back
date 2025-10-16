import request from "supertest";
import app from "../src/app";

declare const __setRole__: (role: "user" | "admin") => void;
declare const __setUserId__: (id: string) => void;
declare const __seedMuscleGroups__: (rows: any[]) => void;
declare const __resetMuscleGroups__: () => void;

describe("Admin • muscle groups", () => {
  beforeEach(() => {
    __resetMuscleGroups__();
    __setRole__("admin");
    __setUserId__("admin_test_id");

    __seedMuscleGroups__([
      { id: 1, name: "Pecho" },
      { id: 2, name: "Espalda" },
    ]);
  });

  describe("GET /admin/muscle-group", () => {
    test("devuelve todos los grupos", async () => {
      const res = await request(app).get("/admin/muscle-group");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          items: expect.arrayContaining([
            expect.objectContaining({ id: 1, name: "Pecho" }),
            expect.objectContaining({ id: 2, name: "Espalda" }),
          ]),
        })
      );
    });
  });

  describe("POST /admin/muscle-group", () => {
    test("crea un grupo", async () => {
      const res = await request(app)
        .post("/admin/muscle-group")
        .send({ name: "Brazos" });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Muscle group created",
          muscleGroup: expect.objectContaining({
            id: expect.any(Number),
            name: "Brazos",
          }),
        })
      );
    });
  });

  describe("PUT /admin/muscle-group/:id", () => {
    test("actualiza un grupo", async () => {
      const res = await request(app)
        .put("/admin/muscle-group/1")
        .send({ name: "Hombros" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Muscle group updated",
          muscleGroup: { id: 1, name: "Hombros" },
        })
      );
    });
  });

  describe("DELETE /admin/muscle-group/:id", () => {
    test("elimina un grupo", async () => {
      const res = await request(app).delete("/admin/muscle-group/1");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Muscle group deleted" });
    });
  });
});
