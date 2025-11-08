import { Request, Response, NextFunction } from "express";

/** Valida formato básico del body en login (sin revelar si existe el correo). */
export function validateLoginBody(req: Request, res: Response, next: NextFunction) {
  const correo = String((req.body ?? {}).correo ?? "").trim();
  const contrasena = String((req.body ?? {}).contrasena ?? "");

  if (!correo || !contrasena || !contrasena.trim()) {
    return res.status(400).json({ ok: false, message: "Datos incompletos." });
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) && !/\s/.test(correo);
  if (!emailOk) return res.status(400).json({ ok: false, message: "Formato de correo inválido." });

  next();
}
