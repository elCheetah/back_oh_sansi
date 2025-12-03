import { Request, Response } from "express";
import {
  solicitarCodigoServicio,
  verificarCodigoServicio,
  resetearContrasenaServicio,
} from "../services/recuperarPass.service";

export const RecuperarPassController = {
  async solicitar(req: Request, res: Response) {
    const correo = String((req.body ?? {}).correo ?? "").trim();
    const r = await solicitarCodigoServicio(correo);
    return res.status(r.status).json({ ok: r.status === 200, message: r.message });
  },

  async verificar(req: Request, res: Response) {
    const { correo, codigo } = req.body as { correo: string; codigo: string };
    const r = await verificarCodigoServicio(correo, codigo);
    if ("err" in r) {
      return res.status(r.status).json({ ok: false, message: r.err });
    }
    return res
      .status(200)
      .json({ ok: true, message: r.message, tokenRecuperacion: r.tokenRecuperacion });
  },

  async resetear(req: Request, res: Response) {
    const { tokenRecuperacion, nuevaContrasena } = req.body as {
      tokenRecuperacion: string;
      nuevaContrasena: string;
      confirmarContrasena: string;
    };
    const r = await resetearContrasenaServicio(tokenRecuperacion, nuevaContrasena);
    if ("err" in r) {
      return res.status(r.status).json({ ok: false, message: r.err });
    }
    return res.status(200).json({ ok: true, ...r.data });
  },
};
