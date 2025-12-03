import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateAuth } from "../middlewares/validarAuth";
import { validateLoginBody } from "../middlewares/login.middleware";

const router = Router();

router.post("/login", validateLoginBody, AuthController.login);
router.post("/logout", validateAuth, AuthController.logout);
router.get("/me", validateAuth, AuthController.me);

export default router;
