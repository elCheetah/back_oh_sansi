import prisma from "../config/database";
import { hashPassword, comparePassword } from "../utils/password";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { enviarCodigoRecuperacion } from "../utils/mailer";
import {
  signToken,
  newJti,
  TOKEN_TTL_SECONDS,
  type Roles,
} from "../utils/jwt";

const JWT_SECRET: string = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("Falta JWT_SECRET");
}

type TokenRecuperacionPayload = {
  tipo: "reset";
  rid: string;
  uid: number;
  correo: string;
};

function generarCodigo6(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, "0");
}

function nombreCompletoUsuario(u: {
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
}) {
  return [u.nombre, u.primer_apellido, u.segundo_apellido ?? ""]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export async function solicitarCodigoServicio(correo: string) {
  const usuario = await prisma.usuarios.findUnique({ where: { correo } });

  if (!usuario || !usuario.estado) {
    return {
      status: 200,
      message: "Si el correo está registrado y activo, enviamos un código.",
    } as const;
  }

  const codigo = generarCodigo6();
  const codeHash = await hashPassword(codigo);
  const rid = crypto.randomBytes(16).toString("hex");
  const exp = Date.now() + 5 * 60 * 1000;

  await prisma.logs.create({
    data: {
      entidad: "auth",
      entidad_id: usuario.id,
      campo: "reset_pass",
      valor_nuevo: JSON.stringify({ rid, codeHash, exp }),
      usuario_id: usuario.id,
      motivo: "Recuperación de contraseña",
    },
  });

  const nombre = nombreCompletoUsuario({
    nombre: usuario.nombre,
    primer_apellido: usuario.primer_apellido,
    segundo_apellido: usuario.segundo_apellido,
  });

  await enviarCodigoRecuperacion(usuario.correo, nombre, codigo);

  return {
    status: 200,
    message: "Si el correo está registrado y activo, enviamos un código.",
  } as const;
}

export async function verificarCodigoServicio(correo: string, codigo: string) {
  const usuario = await prisma.usuarios.findUnique({ where: { correo } });
  if (!usuario) return { status: 401, err: "Código inválido o vencido." } as const;
  if (!usuario.estado) return { status: 403, err: "Usuario sin acceso." } as const;

  const log = await prisma.logs.findFirst({
    where: { entidad: "auth", campo: "reset_pass", usuario_id: usuario.id },
    orderBy: { fecha_cambio: "desc" },
  });

  if (!log || !log.valor_nuevo)
    return { status: 401, err: "Código inválido o vencido." } as const;

  let data: { rid: string; codeHash: string; exp: number };
  try {
    data = JSON.parse(log.valor_nuevo);
  } catch {
    return { status: 401, err: "Código inválido o vencido." } as const;
  }

  const usado = await prisma.logs.findFirst({
    where: {
      entidad: "auth",
      campo: "reset_pass_ok",
      valor_nuevo: data.rid,
      usuario_id: usuario.id,
    },
    select: { id: true },
  });
  if (usado) return { status: 401, err: "Código inválido o vencido." } as const;

  if (Date.now() > data.exp)
    return { status: 401, err: "Código inválido o vencido." } as const;

  const coincide = await comparePassword(codigo, data.codeHash);
  if (!coincide) return { status: 401, err: "Código inválido o vencido." } as const;

  const tokenRecuperacion = jwt.sign(
    {
      tipo: "reset",
      rid: data.rid,
      uid: usuario.id,
      correo: usuario.correo,
    } as TokenRecuperacionPayload,
    JWT_SECRET,
    { expiresIn: 60 * 10 }
  );

  return {
    status: 200,
    message: "Código verificado.",
    tokenRecuperacion,
  } as const;
}

export async function resetearContrasenaServicio(
  tokenRecuperacion: string,
  nuevaContrasena: string
) {
  let payload: TokenRecuperacionPayload;
  try {
    const decodificado = jwt.verify(tokenRecuperacion, JWT_SECRET);
    if (!decodificado || typeof decodificado !== "object") {
      throw new Error("inválido");
    }
    const o = decodificado as any;
    if (
      o.tipo !== "reset" ||
      typeof o.rid !== "string" ||
      typeof o.uid !== "number" ||
      typeof o.correo !== "string"
    ) {
      throw new Error("inválido");
    }
    payload = {
      tipo: "reset",
      rid: o.rid,
      uid: o.uid,
      correo: o.correo,
    };
  } catch {
    return { status: 401, err: "Solicitud inválida o vencida." } as const;
  }

  const usuario = await prisma.usuarios.findUnique({ where: { id: payload.uid } });
  if (!usuario) return { status: 401, err: "Solicitud inválida o vencida." } as const;
  if (!usuario.estado) return { status: 403, err: "Usuario sin acceso." } as const;

  const log = await prisma.logs.findFirst({
    where: { entidad: "auth", campo: "reset_pass", usuario_id: usuario.id },
    orderBy: { fecha_cambio: "desc" },
  });
  if (!log || !log.valor_nuevo)
    return { status: 401, err: "Solicitud inválida o vencida." } as const;

  let data: { rid: string; codeHash: string; exp: number };
  try {
    data = JSON.parse(log.valor_nuevo);
  } catch {
    return { status: 401, err: "Solicitud inválida o vencida." } as const;
  }

  if (payload.rid !== data.rid)
    return { status: 401, err: "Solicitud inválida o vencida." } as const;

  const usado = await prisma.logs.findFirst({
    where: {
      entidad: "auth",
      campo: "reset_pass_ok",
      valor_nuevo: data.rid,
      usuario_id: usuario.id,
    },
    select: { id: true },
  });
  if (usado) return { status: 401, err: "Solicitud inválida o vencida." } as const;

  if (Date.now() > data.exp)
    return { status: 401, err: "Solicitud inválida o vencida." } as const;

  const nuevoHash = await hashPassword(nuevaContrasena);
  const actualizado = await prisma.usuarios.update({
    where: { id: usuario.id },
    data: { contrasena_hash: nuevoHash, actualizado_en: new Date() },
  });

  await prisma.logs.create({
    data: {
      entidad: "auth",
      entidad_id: usuario.id,
      campo: "reset_pass_ok",
      valor_nuevo: data.rid,
      usuario_id: usuario.id,
      motivo: "Código utilizado",
    },
  });

  const rol = String(actualizado.rol) as Roles;
  const nombre = nombreCompletoUsuario({
    nombre: actualizado.nombre,
    primer_apellido: actualizado.primer_apellido,
    segundo_apellido: actualizado.segundo_apellido,
  });

  const payloadAuth = {
    idUser: actualizado.id,
    jti: newJti(),
    nombreCompleto: nombre,
    rol,
    correo: actualizado.correo,
  };

  const token = signToken(payloadAuth);

  return {
    status: 200,
    data: {
      message: "Contraseña actualizada.",
      token,
      expiresIn: TOKEN_TTL_SECONDS,
      user: {
        id: actualizado.id,
        nombreCompleto: nombre,
        rol,
        correo: actualizado.correo,
      },
    },
  } as const;
}
