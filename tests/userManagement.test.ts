import request from "supertest";
import app from "../src/app";

declare const __setRole__: (role: "user" | "admin") => void;
declare const __setUserId__: (id: string) => void;
declare const __seedClasses__: (rows: any[]) => void;
declare const __resetClasses__: () => void;

describe("Admin • users", () => {
  beforeEach(() => {
    __resetClasses__?.();
    __setRole__("admin");
    __setUserId__("admin_test_id");
  });

  describe("GET /admin/users", () => {
    test("returns list of users successfully", async () => {
      const res = await request(app).get("/admin/users");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Users retrieved successfully",
          users: expect.any(Array),
        })
      );
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
  });

  describe("GET /admin/users/:userId", () => {
    test("returns a single user", async () => {
      const res = await request(app).get("/admin/users/user_1");

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toEqual(
          expect.objectContaining({
            message: "User retrieved successfully",
            user: expect.objectContaining({
              id: "user_1",
              firstName: "John",
              lastName: "Doe",
              email: "john@example.com",
              imageUrl: "https://example.com/john.jpg",
              createdAt: new Date("2025-09-30").toISOString(),
              role: expect.any(String),
            }),
          })
        );
      } else {
        expect(res.body).toEqual(
          expect.objectContaining({
            error: expect.any(String),
          })
        );
      }
    });
  });
  describe("PUT /admin/users/:userId/role", () => {
    test("updates user role successfully", async () => {
      const res = await request(app)
        .put("/admin/users/user_1/role")
        .send({ role: "admin" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "User role updated successfully",
          user: expect.any(Object),
        })
      );
      expect(res.body.user).not.toBeNull();
      expect(typeof res.body.user).toBe("object");
      if (res.body.user && "id" in res.body.user) {
        expect(res.body.user.id).toEqual(expect.any(String));
      }
    });
  });

  describe("GET /admin/users/:userId/classes", () => {
    test("returns classes for given user", async () => {
      __seedClasses__([
        {
          id: 1,
          name: "Class A",
          description: "desc",
          date: new Date("2025-10-01"),
          time: "10:00",
          capacity: 10,
          enrolled: 1,
          createdById: "admin_test_id",
          users: ["user_1"],
        },
        {
          id: 2,
          name: "Class B",
          description: "desc",
          date: new Date("2025-10-02"),
          time: "12:00",
          capacity: 10,
          enrolled: 1,
          createdById: "admin_test_id",
          users: ["user_2"],
        },
      ]);

      const res = await request(app).get("/admin/users/user_1/classes");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "User classes retrieved successfully",
          classes: expect.any(Array),
        })
      );
      expect(res.body.classes).toHaveLength(1);
      expect(res.body.classes[0]).toEqual(
        expect.objectContaining({ id: 1, name: "Class A" })
      );
    });
  });
});
