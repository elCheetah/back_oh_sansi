import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Falta JWT_SECRET");
}

export const TOKEN_TTL_SECONDS = 60 * 60 * 2;

export type Roles = "ADMINISTRADOR" | "EVALUADOR" | "RESPONSABLE";

export type AuthTokenPayload = {
  idUser: number;
  jti: string;
  nombreCompleto: string;
  rol: Roles;
  correo: string;
};

export const newJti = () => crypto.randomBytes(16).toString("hex");

export function signToken(p: AuthTokenPayload) {
  return jwt.sign(p, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

function isAuthPayload(x: unknown): x is AuthTokenPayload & JwtPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const validRol =
    o.rol === "ADMINISTRADOR" || o.rol === "EVALUADOR" || o.rol === "RESPONSABLE";
  return (
    typeof o.idUser === "number" &&
    typeof o.jti === "string" &&
    typeof o.nombreCompleto === "string" &&
    typeof o.correo === "string" &&
    validRol
  );
}

export function verifyToken(token: string): AuthTokenPayload & JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded === "string" || !isAuthPayload(decoded)) {
    throw new Error("Token inválido");
  }
  return decoded;
}
