import { Router, Request, Response } from "express";
import checkAdminRole from "../../middleware/admin";
import classRoutes from "./class";
import userRoutes from "./users";

const router = Router();

router.use(checkAdminRole);

router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Admin dashboard" });
});

router.use("/class", classRoutes);
router.use("/users", userRoutes);

export default router;
