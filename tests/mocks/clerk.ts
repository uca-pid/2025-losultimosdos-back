let CURRENT_ROLE: "user" | "admin" = "user";
let CURRENT_USER_ID = "user_test_id";

(global as any).__setRole__ = (role: "user" | "admin") => {
  CURRENT_ROLE = role;
};
(global as any).__setUserId__ = (id: string) => {
  CURRENT_USER_ID = id;
};

export const clerkMiddleware = () => (req: any, _res: any, next: any) => {
  req.auth = {
    userId: CURRENT_USER_ID,
    userRole: CURRENT_ROLE, 
  };
  next();
};

export const clerkClient = {
  users: {
    getUser: async (id: string) => ({
      id,
      publicMetadata: { role: CURRENT_ROLE },
    }),
    updateUser: async () => ({}),
    getUserList: async () => ({
      data: [
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
          createdAt: new Date("2025-09-30").toISOString(),
          publicMetadata: { role: "user" },
        },
      ],
    }),
  },
};

export const getAuth = (req: any) => ({
  userId: req?.auth?.userId ?? CURRENT_USER_ID,
  sessionClaims: { role: CURRENT_ROLE },
});

export const requireAuth = () => (_req: any, _res: any, next: any) => next();
