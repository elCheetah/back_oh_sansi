import { Request, Response, NextFunction } from "express";

/**
 * Middleware para restringir acceso solo a usuarios con rol ADMINISTRADOR.
 * Asume que req.usuario se setea en tu middleware de autenticación JWT.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).usuario; // <- seteado por tu auth

  if (!user || user.rol !== "ADMINISTRADOR") {
    return res.status(403).json({
      ok: false,
      message: "Solo administradores pueden acceder a este recurso",
    });
  }

  next();
}
