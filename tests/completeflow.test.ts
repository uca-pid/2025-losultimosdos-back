import request from "supertest";
import app from "../src/app";

declare const __seedClasses__: (rows: any[]) => void;
declare const __resetClasses__: () => void;
declare const __setRole__: (role: "user" | "admin") => void;
declare const __setUserId__: (id: string) => void;

describe("Flujos end-to-end (admin + user)", () => {
  beforeEach(() => {
    __resetClasses__();          
    __setRole__("admin");        
    __setUserId__("admin_test"); 
  });

  test("flujo completo: crear → inscribir → actualizar → desinscribir → borrar", async () => {

    let list0 = await request(app).get("/classes");
    expect(list0.status).toBe(200);
    expect(Array.isArray(list0.body.classes)).toBe(true);
    expect(list0.body.classes.length).toBe(0);

    __setRole__("admin");
    __setUserId__("admin_1");

    const createRes = await request(app).post("/admin/class").send({
      name: "Cross",
      description: "Fuerza y cardio",
      date: "2025-10-01T12:00:00Z",
      time: "12:00",
      capacity: 8,
    });

    expect(createRes.status).toBe(200);
    expect(createRes.body.message).toBe("Class created successfully");
    const classId = createRes.body.class.id as number;
    expect(classId).toBeDefined();
    expect(createRes.body.class.enrolled ?? 0).toBe(0);
    expect(createRes.body.class.users ?? []).toEqual([]);

    const list1 = await request(app).get("/classes");
    expect(list1.status).toBe(200);
    expect(list1.body.classes.map((c: any) => c.id)).toContain(classId);

    __setRole__("user");
    __setUserId__("user_1");

    const my0 = await request(app).get("/user/my-classes");
    expect(my0.status).toBe(200);
    expect(my0.body.classes).toEqual([]);

    const enroll = await request(app).post("/user/enroll").send({ classId });
    expect(enroll.status).toBe(200);
    expect(enroll.body.message).toBe("Enrolled successfully");
    expect(enroll.body.class.id).toBe(classId);
    expect(enroll.body.class.users).toContain("user_1");
    expect(enroll.body.class.enrolled).toBe(1);

    const enrollAgain = await request(app).post("/user/enroll").send({ classId });
    expect(enrollAgain.status).toBe(400);
    expect(enrollAgain.body.error).toMatch(/Already enrolled/i);

    const my1 = await request(app).get("/user/my-classes");
    expect(my1.status).toBe(200);
    expect(my1.body.classes.map((c: any) => c.id)).toContain(classId);

    __setRole__("admin");
    __setUserId__("admin_1");

    const update = await request(app)
      .put(`/admin/class/${classId}`)
      .send({
        name: "Cross Avanzado",
        description: "Más intensidad",
        date: "2025-10-01T12:30:00Z",
        time: "12:30",
        capacity: 10,
      });

    expect(update.status).toBe(200);
    expect(update.body.message).toBe("Class updated successfully");
    expect(update.body.class.name).toBe("Cross Avanzado");
    expect(update.body.class.capacity).toBe(10);
    expect(update.body.class.time).toBe("12:30");

    __setRole__("user");
    __setUserId__("user_1");

    const unenroll = await request(app).post("/user/unenroll").send({ classId });
    expect(unenroll.status).toBe(200);
    expect(unenroll.body.message).toBe("Unenrolled successfully");
    expect(unenroll.body.class.users).not.toContain("user_1");
    expect(unenroll.body.class.enrolled).toBe(0);

    __setRole__("admin");
    __setUserId__("admin_1");

    const del = await request(app).delete(`/admin/class/${classId}`);
    expect(del.status).toBe(200);
    expect(del.body.message).toBe("Class deleted successfully");

    const list2 = await request(app).get("/classes");
    expect(list2.status).toBe(200);
    expect(list2.body.classes.map((c: any) => c.id)).not.toContain(classId);
  });

  test("autorización: user NO puede usar rutas de admin", async () => {
    __resetClasses__();
    __setRole__("user");
    __setUserId__("user_x");

  
    const c = await request(app).post("/admin/class").send({
      name: "Yoga",
      description: "Suave",
      date: "2025-11-01T09:00:00Z",
      time: "09:00",
      capacity: 10,
    });
    expect(c.status).toBe(403);

    const u = await request(app).put("/admin/class/1").send({
      name: "Yoga Plus",
      description: "Más largo",
      date: "2025-11-01T09:30:00Z",
      time: "09:30",
      capacity: 12,
    });
    expect(u.status).toBe(403);

    const d = await request(app).delete("/admin/class/1");
    expect(d.status).toBe(403);
  });
});
