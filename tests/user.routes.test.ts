import request from "supertest";
import app from "../src/app";

declare const __seedClasses__: (rows: any[]) => void;
declare const __resetClasses__: () => void;
declare const __setRole__: (role: "user" | "admin") => void;
declare const __setUserId__: (id: string) => void;

describe("User Routes - Additional Tests", () => {
  beforeEach(() => {
    __resetClasses__();
    __setRole__("user");
    __setUserId__("user_test_id");

    __seedClasses__([
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

  describe("GET /user/", () => {
    test("returns user dashboard", async () => {
      const res = await request(app).get("/user/");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "User dashboard" });
    });
  });

  describe("POST /user/enroll", () => {
    test("rejects enrollment without classId", async () => {
      const res = await request(app).post("/user/enroll").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining("required"),
          }),
        ])
      );
    });

    test("rejects enrollment for non-existent class", async () => {
      const res = await request(app)
        .post("/user/enroll")
        .send({ classId: 999 });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Class not found");
    });

    test("prevents double enrollment", async () => {
      // First enrollment
      await request(app).post("/user/enroll").send({ classId: 1 });

      // Try to enroll again
      const res = await request(app).post("/user/enroll").send({ classId: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Already enrolled in this class");
    });
  });

  describe("POST /user/unenroll", () => {
    test("rejects unenrollment without classId", async () => {
      const res = await request(app).post("/user/unenroll").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining("required"),
          }),
        ])
      );
    });

    test("rejects unenrollment for non-existent class", async () => {
      const res = await request(app)
        .post("/user/unenroll")
        .send({ classId: 999 });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Class not found");
    });

    test("handles unenrollment when not enrolled", async () => {
      const res = await request(app)
        .post("/user/unenroll")
        .send({ classId: 1 });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Unenrolled successfully");
      expect(res.body.class.enrolled).toBe(0);
    });
  });

  describe("GET /user/my-classes", () => {
    test("returns empty array when no classes are enrolled", async () => {
      const res = await request(app).get("/user/my-classes");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ classes: [] });
    });

    test("returns enrolled classes", async () => {
      // Enroll in a class first
      await request(app).post("/user/enroll").send({ classId: 1 });

      const res = await request(app).get("/user/my-classes");
      expect(res.status).toBe(200);
      expect(res.body.classes).toHaveLength(1);
      expect(res.body.classes[0].id).toBe(1);
    });
  });
});
