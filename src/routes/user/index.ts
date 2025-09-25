import { Router, Request, Response } from "express";
import checkUserRole from "../../middleware/user";
import { PrismaClient } from "@prisma/client";
import { ClassEnrollment } from "../../types/class";
import { validateBody } from "../../middleware/validation";
import { classEnrollmentSchema } from "../../schemas/class.schema";

const router = Router();
const prisma = new PrismaClient();

router.use(checkUserRole);

router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "User dashboard" });
});

router.post(
  "/enroll",
  validateBody(classEnrollmentSchema),
  async (req: Request, res: Response) => {
    const { classId } = req.body as ClassEnrollment;
    const { userId } = req.auth;

    try {
      const gymClass = await prisma.class.findUnique({
        where: { id: classId },
      });
      if (!gymClass) {
        return res.status(404).json({ error: "Class not found" });
      }
      if (gymClass.users.includes(userId)) {
        return res
          .status(400)
          .json({ error: "Already enrolled in this class" });
      }
      const updatedClass = await prisma.class.update({
        where: { id: classId },
        data: {
          enrolled: { increment: 1 },
          users: { push: userId },
        },
      });

      res.json({ message: "Enrolled successfully", class: updatedClass });
    } catch (error) {
      if (error instanceof Error) {
        res
          .status(500)
          .json({ error: "Enrollment failed", details: error.message });
      } else {
        res
          .status(500)
          .json({ error: "Enrollment failed", details: "Unknown error" });
      }
    }
  }
);

router.post(
  "/unenroll",
  validateBody(classEnrollmentSchema),
  async (req: Request, res: Response) => {
    const { classId } = req.body as ClassEnrollment;
    const { userId } = req.auth;

    const gymClass = await prisma.class.findUnique({ where: { id: classId } });
    if (!gymClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const newUsers = gymClass.users.filter((user) => user !== userId);

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: { users: newUsers, enrolled: { decrement: 1 } },
    });

    res.json({ message: "Unenrolled successfully", class: updatedClass });
  }
);

router.get("/my-classes", async (req: Request, res: Response) => {
  const { userId } = req.auth;
  try {
    const classes = await prisma.class.findMany({
      where: {
        users: { has: userId },
      },
    });
    res.json({ classes });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch enrolled classes" });
  }
});

export default router;
