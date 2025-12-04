import { Router } from "express";
import { getAssignedOlympians } from "../controllers/evaluacionIndividual.controller";
import { validateAuth } from "../middlewares/validarAuth";

const router = Router();

router.get("/assigned", validateAuth, getAssignedOlympians);

export default router;
