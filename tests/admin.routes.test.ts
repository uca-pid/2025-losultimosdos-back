import request from "supertest";
import app from "../src/app";

declare const __seedClasses__: (rows: any[]) => void;
declare const __resetClasses__: () => void;
declare const __setRole__: (role: "user" | "admin") => void;
declare const __setUserId__: (id: string) => void;

describe("Admin Routes - Additional Tests", () => {
  beforeEach(() => {
    __resetClasses__();
    __setRole__("admin");
    __setUserId__("admin_test_id");
  });

  describe("POST /admin/class", () => {
    test("rejects request with missing fields", async () => {
      const incompletePayload = {
        name: "HIIT",
        // missing other required fields
      };

      const res = await request(app)
        .post("/admin/class")
        .send(incompletePayload);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.any(String),
          }),
        ])
      );
    });

    test("accepts valid class creation", async () => {
      const validPayload = {
        name: "HIIT",
        description: "High Intensity Training",
        date: "2025-09-30",
        time: "10:00",
        capacity: 20,
      };

      const res = await request(app).post("/admin/class").send(validPayload);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Class created successfully");
    });
  });

  describe("PUT /admin/class/:id", () => {
    beforeEach(() => {
      __seedClasses__([
        {
          id: 1,
          name: "Funcional",
          description: "Clase de funcional",
          date: new Date("2025-09-30T10:00:00Z"),
          time: "10:00",
          capacity: 10,
          enrolled: 0,
          createdById: "admin_test_id",
          users: [],
        },
      ]);
    });

    test("rejects request with missing id", async () => {
      const res = await request(app).put("/admin/class/").send({
        name: "Updated Class",
        description: "Updated description",
        date: "2025-09-30",
        time: "10:00",
        capacity: 15,
      });
      expect(res.status).toBe(404);
    });

    test("rejects request with invalid id", async () => {
      const res = await request(app).put("/admin/class/999").send({
        name: "Updated Class",
        description: "Updated description",
        date: "2025-09-30",
        time: "10:00",
        capacity: 15,
      });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Class not found");
    });

    test("rejects request with missing required fields", async () => {
      const res = await request(app).put("/admin/class/1").send({
        name: "Updated Class",
        // missing other required fields
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.any(String),
          }),
        ])
      );
    });

    test("accepts valid class update", async () => {
      const res = await request(app).put("/admin/class/1").send({
        name: "Updated Class",
        description: "Updated description",
        date: "2025-09-30",
        time: "10:00",
        capacity: 15,
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Class updated successfully");
    });
  });

  describe("DELETE /admin/class/:id", () => {
    beforeEach(() => {
      __seedClasses__([
        {
          id: 1,
          name: "Funcional",
          description: "Clase de funcional",
          date: new Date("2025-09-30T10:00:00Z"),
          time: "10:00",
          capacity: 10,
          enrolled: 0,
          createdById: "admin_test_id",
          users: [],
        },
      ]);
    });

    test("rejects request with missing id", async () => {
      const res = await request(app).delete("/admin/class/");
      expect(res.status).toBe(404);
    });

    test("rejects request with invalid id format", async () => {
      const res = await request(app).delete("/admin/class/invalid");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.any(String),
          }),
        ])
      );
    });

    test("rejects request with non-existent id", async () => {
      const res = await request(app).delete("/admin/class/999");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Class not found");
    });

    test("accepts valid class deletion", async () => {
      const res = await request(app).delete("/admin/class/1");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Class deleted successfully");
    });
  });
});
