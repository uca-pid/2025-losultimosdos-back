import request from "supertest";
import app from "../src/app";

declare const __seedClasses__: (rows: any[]) => void;
declare const __resetClasses__: () => void;
declare const __setRole__: (role: "user" | "admin") => void;
declare const __setUserId__: (id: string) => void;

describe("Admin endpoints (/admin)", () => {
  beforeEach(() => {
    __resetClasses__();
    __setRole__("admin");
    __setUserId__("admin_test_id");

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
      {
        id: 2,
        name: "Spinning",
        description: "Clase de spinning",
        date: new Date("2025-09-30T11:00:00Z"),
        time: "11:00",
        capacity: 15,
        enrolled: 0,
        createdById: "admin_test_id",
        users: [],
      },
    ]);
  });

  describe("GET /admin/", () => {
    test("returns admin dashboard", async () => {
      const res = await request(app).get("/admin/");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Admin dashboard" });
    });
  });

  describe("GET /admin/users", () => {
    test("returns list of users successfully", async () => {
      const res = await request(app).get("/admin/users");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Users retrieved successfully");
      expect(res.body.users).toHaveLength(2);
      expect(res.body.users[0]).toEqual({
        id: "user_1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        imageUrl: "https://example.com/john.jpg",
        createdAt: new Date("2025-09-30").toISOString(),
        role: "user",
      });
    });

    test("blocks access if role is not admin", async () => {
      __setRole__("user");
      const res = await request(app).get("/admin/users");
      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });
  });

  describe("POST /admin/class", () => {
    test("creates a class successfully", async () => {
      const payload = {
        name: "HIIT",
        description: "Alta intensidad",
        date: "2025-10-01T12:00:00Z",
        time: "12:00",
        capacity: 20,
      };

      const res = await request(app).post("/admin/class").send(payload);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Class created successfully");
      expect(res.body.class).toBeTruthy();
      expect(res.body.class.name).toBe("HIIT");
      expect(res.body.class.createdById).toBe("admin_test_id");
      expect(res.body.class.enrolled ?? 0).toBe(0);
      expect(res.body.class.users ?? []).toEqual([]);
    });

    test("rejects request with missing fields", async () => {
      const incompletePayload = {
        name: "HIIT",
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

    test("blocks creation if role is not admin", async () => {
      __setRole__("user");
      __setUserId__("user_test_id");

      const res = await request(app).post("/admin/class").send({
        name: "Yoga",
        description: "Suave",
        date: "2025-10-02T09:00:00Z",
        time: "09:00",
        capacity: 10,
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });
  });

  describe("PUT /admin/class/:id", () => {
    test("updates a class successfully", async () => {
      const res = await request(app).put("/admin/class/1").send({
        name: "Funcional Avanzado",
        description: "Más intensidad",
        date: "2025-09-30T10:00:00Z",
        time: "10:30",
        capacity: 12,
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Class updated successfully");
      expect(res.body.class.id).toBe(1);
      expect(res.body.class.name).toBe("Funcional Avanzado");
      expect(res.body.class.capacity).toBe(12);
      expect(res.body.class.time).toBe("10:30");
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
  });

  describe("DELETE /admin/class/:id", () => {
    test("deletes a class successfully", async () => {
      const del = await request(app).delete("/admin/class/1");
      expect(del.status).toBe(200);
      expect(del.body.message).toBe("Class deleted successfully");

      const list = await request(app).get("/classes");
      expect(list.status).toBe(200);
      const ids = (list.body.classes || []).map((c: any) => c.id);
      expect(ids).not.toContain(1);
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
  });
});
