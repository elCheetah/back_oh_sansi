import { Router } from "express";
import { RecuperarPassController } from "../controllers/recuperarPass.controller";
import {
  validarBodySolicitud,
  validarBodyVerificacion,
  validarBodyReset,
} from "../middlewares/recuperarPass.midlewares";

const router = Router();

router.post("/solicitar", validarBodySolicitud, RecuperarPassController.solicitar);
router.post("/verificarCod", validarBodyVerificacion, RecuperarPassController.verificar);
router.post("/resetear", validarBodyReset, RecuperarPassController.resetear);

export default router;
