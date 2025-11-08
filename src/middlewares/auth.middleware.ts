import { Request, Response, NextFunction } from "express";
import type { Roles } from "../utils/jwt";

export function validateLoginBody(req: Request, res: Response, next: NextFunction) {
  const correo = String((req.body ?? {}).correo ?? "").trim();
  const contrasena = String((req.body ?? {}).contrasena ?? "");

  if (!correo || !contrasena || !contrasena.trim()) {
    return res.status(400).json({ ok: false, message: "Datos incompletos." });
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) && !/\s/.test(correo);
  if (!emailOk) {
    return res.status(400).json({ ok: false, message: "Formato de correo inválido." });
  }
  next();
}

export function roleGuard(allowed: Roles[]) {
  const set = new Set<Roles>(allowed);
  return (req: Request & { auth?: { rol: Roles } }, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ ok: false, message: "No autorizado." });
    if (!set.has(req.auth.rol)) return res.status(403).json({ ok: false, message: "Acceso denegado." });
    next();
  };
}
