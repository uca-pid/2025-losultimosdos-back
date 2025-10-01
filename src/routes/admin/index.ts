import { Router, Request, Response } from "express";
import checkAdminRole from "../../middleware/admin";
import classRoutes from "./class";
import userRoutes from "./users";
import muscleGroupRoutes from "./muscle-group";
import excersicesRoutes from "./excersices";
import routinesRoutes from "./routines";

const router = Router();

router.use(checkAdminRole);

router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Admin dashboard" });
});

router.use("/class", classRoutes);
router.use("/users", userRoutes);
router.use("/muscle-group", muscleGroupRoutes);
router.use("/excersices", excersicesRoutes);
router.use("/routines", routinesRoutes);

export default router;
