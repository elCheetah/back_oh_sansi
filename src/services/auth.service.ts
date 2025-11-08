import { prisma } from "../config/database";
import bcrypt from "bcryptjs";
import { AuthTokenPayload, TOKEN_TTL_SECONDS, newJti, signToken, type Roles } from "../utils/jwt";

function nombreCompleto(u: any) {
  return [u.nombre, u.ap_paterno, u.ap_materno ?? ""].filter(Boolean).join(" ").trim();
}

/** Regla: 401 "Credenciales inválidas." (no se revela si correo o contraseña falló). 403 inactivo. */
export async function loginService(correo: string, contrasena: string) {
  const user = await prisma.usuarios.findUnique({ where: { correo } });
  if (!user) return { status: 401, err: "Credenciales inválidas." } as const;
  if (!user.estado) return { status: 403, err: "Usuario sin acceso." } as const;

  const ok = await bcrypt.compare(contrasena, user.contrasena_hash);
  if (!ok) return { status: 401, err: "Credenciales inválidas." } as const;

  const rol = String(user.rol) as Roles;

  const payload: AuthTokenPayload = {
    idUser: user.id,
    jti: newJti(),
    nombreCompleto: nombreCompleto(user),
    rol,
    correo: user.correo,
  };

  const token = signToken(payload);

  return {
    status: 200,
    data: {
      token,
      expiresIn: TOKEN_TTL_SECONDS,
      user: {
        id: user.id,
        nombreCompleto: payload.nombreCompleto,
        rol,
        correo: user.correo,
      },
    },
  } as const;
}

/** Logout: registra revocación (lista negra por jti) en Logs, sin tocar Prisma. */
export async function logoutService(jti: string, usuario_id: number) {
  await prisma.logs.create({
    data: {
      entidad: "auth",
      entidad_id: usuario_id,
      campo: "logout",
      valor_nuevo: jti,
      usuario_id,
      motivo: "Cierre de sesión",
    },
  });
  return { status: 200, message: "Sesión cerrada." } as const;
}
