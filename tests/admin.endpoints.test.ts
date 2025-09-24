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

  test("GET /admin/ devuelve el dashboard", async () => {
    const res = await request(app).get("/admin/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Admin dashboard" });
  });

  test("POST /admin/class crea una clase", async () => {
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

  test("PUT /admin/class/:id actualiza una clase", async () => {
    const res = await request(app)
      .put("/admin/class/1")
      .send({
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

  test("DELETE /admin/class/:id elimina una clase", async () => {
    const del = await request(app).delete("/admin/class/1");
    expect(del.status).toBe(200);
    expect(del.body.message).toBe("Class deleted successfully");

    const list = await request(app).get("/classes");
    expect(list.status).toBe(200);
    const ids = (list.body.classes || []).map((c: any) => c.id);
    expect(ids).not.toContain(1);
  });

  test("bloquea creación si el rol no es admin", async () => {
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
