import { Router } from "express";
import { getDashboardStats } from "../controllers/estadisticas.controller"; // ← CORREGIDO

const router = Router();

router.get("/dashboard", getDashboardStats);

export default router;