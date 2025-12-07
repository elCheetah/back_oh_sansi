import { Router } from "express";
import { EvaluadorController } from "../controllers/evaluador.controller";
import { validate } from "../middlewares/validate";
import { registroEvaluadorSchema } from "../schemas/evaluador.schema";

const router = Router();

// POST /api/evaluadores/registro
router.post(
  "/registro",
  validate(registroEvaluadorSchema),
  EvaluadorController.registro
);

export default router;
