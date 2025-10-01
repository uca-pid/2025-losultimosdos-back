export {};
import { jest } from "@jest/globals";
type GymClass = {
  id: number;
  name: string;
  description: string;
  date: Date;
  time: string;
  capacity: number;
  enrolled: number;
  createdById: string;
  users: string[];
};

const db = {
  classes: [] as GymClass[],
};

let CURRENT_USER_ID = "user_test_id";
let CURRENT_ROLE: "user" | "admin" = "user";

jest.mock("@clerk/express", () => {
  const clerkMiddleware = () => (req: any, _res: any, next: any) => {
    req.auth = {
      userId: CURRENT_USER_ID,
      userRole: CURRENT_ROLE, // propiedad nuestra para el modo test
    };
    next();
  };

  const clerkClient = {
    users: {
      getUser: jest.fn(async (id: string) => ({
        id,
        publicMetadata: { role: CURRENT_ROLE },
      })),
      updateUser: jest.fn(async () => ({})),
      getUserList: jest.fn(async () => [
        {
          id: "user_1",
          firstName: "John",
          lastName: "Doe",
          emailAddresses: [{ emailAddress: "john@example.com" }],
          imageUrl: "https://example.com/john.jpg",
          createdAt: new Date("2025-09-30").toISOString(),
          publicMetadata: { role: "user" },
        },
        {
          id: "user_2",
          firstName: "Jane",
          lastName: "Smith",
          emailAddresses: [{ emailAddress: "jane@example.com" }],
          imageUrl: "https://example.com/jane.jpg",
          createdAt: new Date("2025-09-29").toISOString(),
          publicMetadata: { role: "admin" },
        },
      ]),
    },
  };

  return { clerkMiddleware, clerkClient };
});

jest.mock("@clerk/express/webhooks", () => ({
  verifyWebhook: jest.fn(async (_req: any) => ({
    type: "user.created",
    data: { id: "u_123" },
  })),
}));

jest.mock("@prisma/client", () => {
  class PrismaClient {
    class = {
      findMany: jest.fn(async (args?: any) => {
        if (args?.where?.users?.has) {
          const uid = args.where.users.has as string;
          return db.classes.filter(
            (c) => Array.isArray(c.users) && c.users.includes(uid)
          );
        }
        return db.classes.map((c) => ({ ...c }));
      }),

      findUnique: jest.fn(async ({ where: { id } }: any) => {
        return db.classes.find((c) => c.id === id) ?? null;
      }),

      create: jest.fn(async ({ data }: any) => {
        const newId =
          data.id ??
          (db.classes.length
            ? Math.max(...db.classes.map((c) => c.id)) + 1
            : 1);

        const row: GymClass = {
          id: newId,
          name: data.name,
          description: data.description,
          date: new Date(data.date),
          time: data.time,
          capacity: data.capacity,
          enrolled: data.enrolled ?? 0,
          createdById: data.createdById ?? CURRENT_USER_ID,
          users: Array.isArray(data.users) ? data.users.slice() : [],
        };

        // Ensure users is always an array
        if (!Array.isArray(row.users)) {
          row.users = [];
        }

        db.classes.push(row);
        return { ...row };
      }),

      update: jest.fn(async ({ where: { id }, data }: any) => {
        const idx = db.classes.findIndex((c) => c.id === id);
        if (idx === -1) throw new Error("Class not found");

        const curr = db.classes[idx];
        const copy: GymClass = { ...curr };

        // Ensure users is always an array
        if (!Array.isArray(copy.users)) {
          copy.users = [];
        }

        if (data.name !== undefined) copy.name = data.name;
        if (data.description !== undefined) copy.description = data.description;
        if (data.date !== undefined) copy.date = new Date(data.date);
        if (data.time !== undefined) copy.time = data.time;
        if (data.capacity !== undefined) copy.capacity = data.capacity;

        if (data.enrolled?.increment !== undefined) {
          copy.enrolled =
            (copy.enrolled ?? 0) + Number(data.enrolled.increment || 0);
        }
        if (data.enrolled?.decrement !== undefined) {
          copy.enrolled = Math.max(
            0,
            (copy.enrolled ?? 0) - Number(data.enrolled.decrement || 0)
          );
        }

        if (data.users !== undefined) {
          const u = data.users;

          if (u && typeof u === "object" && !Array.isArray(u) && "push" in u) {
            const val = (u as any).push;
            if (val !== undefined && val !== null) {
              copy.users = Array.isArray(copy.users) ? copy.users.slice() : [];
              copy.users.push(String(val));
            }
          } else if (Array.isArray(u)) {
            copy.users = u.map((x) => String(x)).filter((x) => x);
          } else if (u && typeof u === "object" && "set" in u) {
            const arr = (u as any).set ?? [];
            copy.users = arr
              .map((x: any) => String(x))
              .filter((x: string) => x);
          }
        }

        db.classes[idx] = copy;
        return { ...copy };
      }),

      delete: jest.fn(async ({ where: { id } }: any) => {
        const idx = db.classes.findIndex((c) => c.id === id);
        if (idx === -1) throw new Error("Class not found");
        const deleted = db.classes.splice(idx, 1)[0];
        return { ...deleted };
      }),
    };
  }

  return { PrismaClient };
});

declare global {
  var __seedClasses__: (rows: GymClass[]) => void;
  var __resetClasses__: () => void;
  var __setRole__: (role: "user" | "admin") => void;
  var __setUserId__: (id: string) => void;
}

global.__seedClasses__ = (rows: GymClass[]) => {
  db.classes = rows.map((r) => ({
    ...r,
    date: new Date(r.date),
    users: Array.isArray(r.users) ? r.users.slice() : [],
    enrolled: Number(r.enrolled ?? 0),
  }));
};

global.__resetClasses__ = () => {
  db.classes = [];
};

global.__setRole__ = (role: "user" | "admin") => {
  CURRENT_ROLE = role;
};

global.__setUserId__ = (id: string) => {
  CURRENT_USER_ID = id;
};

beforeAll(() => {
  process.env.NODE_ENV = "test";
});

afterAll(async () => {
  jest.clearAllMocks();
});
