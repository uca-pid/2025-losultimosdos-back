import request from "supertest";
import app from "../src/app";

describe("User endpoints (/user)", () => {
  describe("GET /user/", () => {
    test("returns user dashboard", async () => {
      const res = await request(app).get("/user/");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "User dashboard" });
    });
  });

  beforeEach(async () => {
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

  test("GET /user/my-classes returns [] initially", async () => {
    const res = await request(app).get("/user/my-classes");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ classes: [] });
  });

  describe("POST /user/enroll", () => {
    test("enrolls user in class successfully", async () => {
      const res = await request(app).post("/user/enroll").send({ classId: 1 });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Enrolled successfully");
      expect(res.body.class.id).toBe(1);
      expect(res.body.class.enrolled).toBe(1);
      expect(res.body.class.users).toContain("user_test_id");
    });

    test("rejects enrollment with missing classId", async () => {
      const res = await request(app).post("/user/enroll").send({});
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

    test("rejects enrollment with invalid classId type", async () => {
      const res = await request(app)
        .post("/user/enroll")
        .send({ classId: "invalid" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });

    test("rejects enrollment in non-existent class", async () => {
      const res = await request(app)
        .post("/user/enroll")
        .send({ classId: 999 });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Class not found");
    });

    test("rejects enrollment when already enrolled", async () => {
      // First enrollment
      await request(app).post("/user/enroll").send({ classId: 1 });

      // Try to enroll again
      const res = await request(app).post("/user/enroll").send({ classId: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Already enrolled in this class");
    });

    test("rejects enrollment when class is full", async () => {
      // Create a class with capacity 1 and already enrolled user
      (globalThis as any).__resetClasses__();
      (globalThis as any).__seedClasses__([
        {
          id: 1,
          name: "Full Class",
          description: "This class is full",
          date: new Date("2025-09-30T10:00:00Z"),
          time: "10:00",
          capacity: 1,
          enrolled: 1,
          createdById: "admin_1",
          users: ["other_user"],
        },
      ]);

      const res = await request(app).post("/user/enroll").send({ classId: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Class is full");
    });
  });

  describe("POST /user/unenroll", () => {
    beforeEach(async () => {
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
      await request(app).post("/user/enroll").send({ classId: 1 });
    });

    test("unenrolls user successfully", async () => {
      const res = await request(app)
        .post("/user/unenroll")
        .send({ classId: 1 });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Unenrolled successfully");
      expect(res.body.class.users).not.toContain("user_test_id");
      expect(res.body.class.enrolled).toBe(0);
    });

    test("rejects unenrollment with missing classId", async () => {
      const res = await request(app).post("/user/unenroll").send({});
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

    test("rejects unenrollment with invalid classId type", async () => {
      const res = await request(app)
        .post("/user/unenroll")
        .send({ classId: "invalid" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });

    test("rejects unenrollment from non-existent class", async () => {
      const res = await request(app)
        .post("/user/unenroll")
        .send({ classId: 999 });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Class not found");
    });

    test("rejects unenrollment when not enrolled", async () => {
      const res = await request(app)
        .post("/user/unenroll")
        .send({ classId: 2 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Not enrolled in this class");
    });
  });
});
