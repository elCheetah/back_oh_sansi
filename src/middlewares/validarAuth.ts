//src/middlewares/validarAuth.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import prisma from "../config/database";

type AuthUser = {
  id: number;
  jti: string;
  rol: "ADMINISTRADOR" | "EVALUADOR" | "RESPONSABLE";
  correo: string;
  nombreCompleto: string;
};

export async function validateAuth(
  req: Request & { auth?: AuthUser },
  res: Response,
  next: NextFunction
) {
  try {
    const hdr = req.headers.authorization || "";
    const [type, token] = hdr.split(" ");
    if (type !== "Bearer" || !token) {
      return res.status(401).json({ ok: false, message: "No autorizado." });
    }

    const decoded = verifyToken(token);

    const revoked = await prisma.logs.findFirst({
      where: {
        entidad: "auth",
        campo: "logout",
        valor_nuevo: decoded.jti,
      },
      select: { id: true },
    });

    if (revoked) {
      return res.status(401).json({ ok: false, message: "Sesión cerrada." });
    }

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
