import request from "supertest";
import app from "../src/app";

describe("User endpoints (/user)", () => {
  beforeEach(() => {
    (globalThis as any).__resetClasses__();
    (globalThis as any).__seedClasses__([
      {
        id: 1,
        name: "Funcional",
        description: "Clase de funcional",
        date: new Date("2025-09-30T10:00:00Z"),
        time: "10:00",
        capacity: 10,
        enrolled: 0,
        createdById: "admin_1",
        users: [],
      },
      {
        id: 2,
        name: "Spinning",
        description: "Clase de spinning",
        date: new Date("2025-09-30T11:00:00Z"),
        time: "11:00",
        capacity: 10,
        enrolled: 1,
        createdById: "admin_1",
        users: ["other_user"],
      },
    ]);
  });

  test("GET /user/my-classes devuelve [] al inicio", async () => {
    const res = await request(app).get("/user/my-classes");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ classes: [] });
  });

  test("POST /user/enroll inscribe al usuario en la clase", async () => {
    const res = await request(app).post("/user/enroll").send({ classId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Enrolled successfully");
    expect(res.body.class.id).toBe(1);
    expect(res.body.class.enrolled).toBe(1);
    expect(res.body.class.users).toContain("user_test_id");
  });

  test("POST /user/unenroll desinscribe al usuario", async () => {
    await request(app).post("/user/enroll").send({ classId: 1 });
    const res = await request(app).post("/user/unenroll").send({ classId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Unenrolled successfully");
    expect(res.body.class.users).not.toContain("user_test_id");
    expect(res.body.class.enrolled).toBe(0);
  });
});
