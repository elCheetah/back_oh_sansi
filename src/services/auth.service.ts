import bcrypt from "bcryptjs";
import prisma from "../config/database";
import {
  AuthTokenPayload,
  TOKEN_TTL_SECONDS,
  newJti,
  signToken,
  type Roles,
} from "../utils/jwt";

function nombreCompleto(u: {
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
}) {
  return [u.nombre, u.primer_apellido, u.segundo_apellido ?? ""]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export async function loginService(correo: string, contrasena: string) {
  const user = await prisma.usuarios.findUnique({
    where: { correo },
  });

  if (!user) {
    return { status: 401, err: "Credenciales inválidas." } as const;
  }

  if (!user.estado) {
    return { status: 403, err: "Usuario sin acceso." } as const;
  }

  const ok = await bcrypt.compare(contrasena, user.contrasena_hash);
  if (!ok) {
    return { status: 401, err: "Credenciales inválidas." } as const;
  }

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
