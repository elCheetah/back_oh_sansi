import { Request, Response } from "express";
import { loginService, logoutService } from "../services/auth.service";

export const AuthController = {
  async login(req: Request, res: Response) {
    const { correo, contrasena } = req.body as { correo: string; contrasena: string };
    const r = await loginService(correo, contrasena);
    if ("data" in r) return res.status(200).json({ ok: true, ...r.data });
    return res.status(r.status).json({ ok: false, message: r.err });
  },

  async logout(req: Request, res: Response) {
    const auth = (req as any).auth as { jti: string; id: number }; // inyectado por validateAuth
    const r = await logoutService(auth.jti, auth.id);
    return res.status(r.status).json({ ok: true, message: r.message });
  },

  async me(req: Request, res: Response) {
    return res.json({ ok: true, user: (req as any).auth });
  },
};
