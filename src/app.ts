import express, { Request, Response, NextFunction } from "express";
import cron from "node-cron";
import { asyncHandler } from "./middleware/asyncHandler";
import cors from "cors";
import dotenv from "dotenv";
import { clerkClient, clerkMiddleware } from "@clerk/express";
import { verifyWebhook } from "@clerk/express/webhooks";
import { PrismaClient } from "@prisma/client";
import { WebhookEvent } from "@clerk/backend";
import adminRoutes from "./routes/admin/index";
import userRoutes from "./routes/user/index";
import ClassService from "./services/class.service";
import { ApiValidationError } from "./services/api-validation-error";
import ExerciseService from "./services/excersice.service";
import RoutineService from "./services/routine.service";
import { validateParams } from "./middleware/validation";
import { routineIdParamSchema } from "./schemas/routine.schema";
import UserService from "./services/user.service";
import GoalService from "./services/goal.service"; 

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.post(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const evt = (await verifyWebhook(req)) as WebhookEvent;
      const eventType = evt.type;

      if (eventType === "user.created") {
        const { id } = evt.data;

        try {
          await clerkClient.users.updateUser(id, {
            publicMetadata: { role: "user", plan: "basic" },
          });
          console.log(`User ${id} assigned role: user`);
          res
            .status(200)
            .json({ success: true, message: "Role assigned successfully" });
        } catch (error) {
          console.error(`Error assigning role to user ${id}:`, error);
          res
            .status(500)
            .json({ success: false, message: "Failed to assign role" });
        }
      }
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return res.status(400).send("Error verifying webhook");
    }
  }
);

app.get(
  "/goals",
  asyncHandler(async (req: Request, res: Response) => {
    const { active } = req.query as { active?: string };

    const filters: { active?: boolean } = {};
    if (active === "true") filters.active = true;
    if (active === "false") filters.active = false;

    const goals = await GoalService.list(filters);

    res.json({ goals });
  })
);

cron.schedule("0 0 * * *", async () => {
  console.log("Running daily user count job...");

  try {
    const users = await clerkClient.users.getUserList({
      limit: 100,
    });

    const basic = users.data.filter(
      (user) => user.publicMetadata.plan === "basic"
    ).length;
    const premium = users.data.filter(
      (user) => user.publicMetadata.plan === "premium"
    ).length;

    await prisma.dailyUserCount.create({
      data: {
        date: new Date(),
        basic,
        premium,
      },
    });

    console.log("✅ User count saved:", basic, premium);
  } catch (err) {
    console.error("❌ Error saving user count:", err);
  }
});
// Log all incoming requests
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/admin", adminRoutes);
app.use("/user", userRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get(
  "/classes",
  asyncHandler(async (_req: Request, res: Response) => {
    const classes = await ClassService.getAllClasses();
    res.json({ classes });
  })
);

app.get(
  "/exercises",
  asyncHandler(async (req: Request, res: Response) => {
    const { q, muscleGroupId } = req.query as any;
    const items = await ExerciseService.list({
      q: q as string | undefined,
      muscleGroupId: muscleGroupId ? Number(muscleGroupId) : undefined,
    });
    res.json({ total: items.length, items });
  })
);

app.get(
  "/routines",
  asyncHandler(async (_req: Request, res: Response) => {
    const items = await RoutineService.list();
    res.json({ total: items.length, items });
  })
);
app.get(
  "/routines/users-count",
  asyncHandler(async (_req, res) => {
    const items = await RoutineService.listNamesWithUsersCountSQL();

    res.json({ total: items.length, items });
  })
);

app.get(
  "/routines/:id(\\d+)",
  validateParams(routineIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const r = await RoutineService.getById(id);
    if (!r) throw new ApiValidationError("Routine not found", 404);
    res.json(r);
  })
);
app.get(
  "/classes/busiest-hour",
  asyncHandler(async (req, res) => {
    const upcoming =
      String(req.query.upcoming ?? "true").toLowerCase() === "true";

    const items = await ClassService.enrollmentsByHour(upcoming);

    res.json({
      total: items.length,
      items,
      top: items[0] ?? null,
    });
  })
);

app.get(
  "/classes/enrollments-count",
  asyncHandler(async (req, res) => {
    const upcoming =
      String(req.query.upcoming ?? "false").toLowerCase() === "true";
    const items = await ClassService.listNamesWithEnrollCount(upcoming);
    res.json({ total: items.length, items });
  })
);

app.get(
  "/daily-user-count",
  asyncHandler(async (_req: Request, res: Response) => {
    const dailyUserCount = await UserService.getDailyUserCount();
    res.json({
      data: dailyUserCount,
    });
  })
);
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("[Error Handler]", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
  });

  if (err instanceof ApiValidationError) {
    console.log("[Error Handler] ApiValidationError:", {
      statusCode: err.statusCode,
      message: err.message,
    });
    res.status(err.statusCode).json({ error: err.message });
  } else {
    console.error("[Error Handler] Unexpected error:", err);
    res.status(500).json({
      error: "Something went wrong!",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Server on ${PORT}`));
}

export default app;
