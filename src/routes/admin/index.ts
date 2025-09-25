import { Router, Request, Response } from "express";
import checkAdminRole from "../../middleware/admin";
import { PrismaClient } from "@prisma/client";
import { ClassInput } from "../../types/class";
import { validateBody, validateParams } from "../../middleware/validation";
import {
  classInputSchema,
  classIdParamSchema,
} from "../../schemas/class.schema";

const router = Router();
const prisma = new PrismaClient();

router.use(checkAdminRole);

router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Admin dashboard" });
});

router.post(
  "/class",
  validateBody(classInputSchema),
  async (req: Request, res: Response) => {
    const { name, description, date, time, capacity } = req.body as ClassInput;
    const dateTime = new Date(`${date}`);

    const { userId } = req.auth;
    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        date: dateTime,
        time,
        capacity,
        createdById: userId,
      },
    });
    res.json({ message: "Class created successfully", class: newClass });
  }
);

router.put(
  "/class/:id",
  validateParams(classIdParamSchema),
  validateBody(classInputSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, date, time, capacity } = req.body as ClassInput;
    const numberId = parseInt(id);

    const gymClass = await prisma.class.findUnique({ where: { id: numberId } });
    if (!gymClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const dateTime = new Date(`${date}`);
    const updatedClass = await prisma.class.update({
      where: { id: numberId },
      data: { name, description, date: dateTime, time, capacity },
    });

    res.json({ message: "Class updated successfully", class: updatedClass });
  }
);

router.delete(
  "/class/:id",
  validateParams(classIdParamSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const numberId = parseInt(id);

    const gymClass = await prisma.class.findUnique({ where: { id: numberId } });
    if (!gymClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    await prisma.class.delete({ where: { id: numberId } });
    res.json({ message: "Class deleted successfully" });
  }
);

export default router;
