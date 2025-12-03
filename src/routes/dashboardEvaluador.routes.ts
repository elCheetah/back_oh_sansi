// src/routes/dashboardEvaluador.routes.ts
import { Router } from "express";
import { getDashboardEvaluador } from "../controllers/dashboardEvaluador.controller";
import { validateAuth } from "../middlewares/validarAuth";

const router = Router();

// Solo evaluadores autenticados
router.get("/dashboard", validateAuth, getDashboardEvaluador);

export default router;