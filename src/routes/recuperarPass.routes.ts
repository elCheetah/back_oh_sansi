import { Router } from "express";
import { RecuperarPassController } from "../controllers/recuperarPass.controller";
import {
  validarBodySolicitud,
  validarBodyVerificacion,
  validarBodyReset,
} from "../middlewares/recuperarPass.midlewares";

const router = Router();

// Paso 1: solicitar código
router.post("/solicitar", validarBodySolicitud, RecuperarPassController.solicitar);

// Paso 2: verificar código y devolver token de recuperación
router.post("/verificarCod", validarBodyVerificacion, RecuperarPassController.verificar);

// Paso 3: setear nueva contraseña (requiere tokenRecuperacion)
router.post("/resetear", validarBodyReset, RecuperarPassController.resetear);

export default router;
