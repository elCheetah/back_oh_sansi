import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/database";
import type { Roles } from "../utils/jwt";

// Tipos locales (no tocamos types globales)
export type AuthUser = {
  id: number;
  jti: string;
  rol: Roles;
  correo: string;
  nombreCompleto: string;
};
export type AuthRequest = Request & { auth?: AuthUser };

/**
 * validateAuth: exige Bearer token, valida firma/exp y
 * revisa si el jti está revocado en Logs:
 *   entidad="auth", campo="logout", valor_nuevo=jti
 */
export async function validateAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const hdr = req.headers.authorization || "";
    const [type, token] = hdr.split(" ");
    if (type !== "Bearer" || !token) {
      return res.status(401).json({ ok: false, message: "No autorizado." });
    }

    const decoded = verifyToken(token);

    const revoked = await prisma.logs.findFirst({
      where: { entidad: "auth", campo: "logout", valor_nuevo: decoded.jti },
      select: { id: true },
    });
    if (revoked) return res.status(401).json({ ok: false, message: "Sesión cerrada." });

    // Mapeo: token usa idUser -> auth.id
    req.auth = {
      id: decoded.idUser,
      jti: decoded.jti,
      rol: decoded.rol,
      correo: decoded.correo,
      nombreCompleto: decoded.nombreCompleto,
    };
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "Token inválido o expirado." });
  }
}

/** Helper para recuperar el id del usuario autenticado */
export function getUserId(req: AuthRequest): number {
  if (!req.auth) throw new Error("No autorizado.");
  return req.auth.id;
}
