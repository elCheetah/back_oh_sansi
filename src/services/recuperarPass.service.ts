import { prisma } from "../config/database";
import { hashPassword, comparePassword } from "../utils/password";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { enviarCodigoRecuperacion } from "../utils/mailer";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("Falta JWT_SECRET");

type TokenRecuperacionPayload = {
  tipo: "reset";
  rid: string;       // id de la solicitud de reset
  uid: number;       // id de usuario
  correo: string;
};

// PASO 1: solicitar código
export async function solicitarCodigoServicio(correo: string) {
  const usuario = await prisma.usuarios.findUnique({ where: { correo } });

  // Respuesta genérica (no filtramos existencia)
  if (!usuario || !usuario.estado) {
    return { status: 200, message: "Si el correo está registrado y activo, enviamos un código." } as const;
  }

  const codigo = generarCodigo6();
  const codeHash = await hashPassword(codigo);
  const rid = crypto.randomBytes(16).toString("hex");
  const exp = Date.now() + 2 * 60 * 1000; // 2 minutos

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

  const nombre = [usuario.nombre, usuario.ap_paterno, usuario.ap_materno ?? ""].filter(Boolean).join(" ").trim();
  await enviarCodigoRecuperacion(usuario.correo, nombre, codigo);

  return { status: 200, message: "Si el correo está registrado y activo, enviamos un código." } as const;
}

// PASO 2: verificar código → devuelve token de recuperación (válido por 10 min)
export async function verificarCodigoServicio(correo: string, codigo: string) {
  const usuario = await prisma.usuarios.findUnique({ where: { correo } });
  if (!usuario) return { status: 401, err: "Código inválido o vencido." } as const;
  if (!usuario.estado) return { status: 403, err: "Usuario sin acceso." } as const;

  const log = await prisma.logs.findFirst({
    where: { entidad: "auth", campo: "reset_pass", usuario_id: usuario.id },
    orderBy: { fecha_cambio: "desc" },
  });
  if (!log || !log.valor_nuevo) return { status: 401, err: "Código inválido o vencido." } as const;

  let data: { rid: string; codeHash: string; exp: number };
  try {
    data = JSON.parse(log.valor_nuevo);
  } catch {
    return { status: 401, err: "Código inválido o vencido." } as const;
  }

  const usado = await prisma.logs.findFirst({
    where: { entidad: "auth", campo: "reset_pass_ok", valor_nuevo: data.rid, usuario_id: usuario.id },
    select: { id: true },
  });
  if (usado) return { status: 401, err: "Código inválido o vencido." } as const;

  if (Date.now() > data.exp) return { status: 401, err: "Código inválido o vencido." } as const;

  const coincide = await comparePassword(codigo, data.codeHash);
  if (!coincide) return { status: 401, err: "Código inválido o vencido." } as const;

  // Emitir token de recuperación (10 minutos)
  const tokenRecuperacion = jwt.sign(
    { tipo: "reset", rid: data.rid, uid: usuario.id, correo: usuario.correo } as TokenRecuperacionPayload,
    JWT_SECRET,
    { expiresIn: 60 * 10 }
  );

  return { status: 200, message: "Código verificado.", tokenRecuperacion } as const;
}

// PASO 3: resetear contraseña (requiere token de recuperación)
export async function resetearContrasenaServicio(tokenRecuperacion: string, nuevaContrasena: string) {
  let payload: TokenRecuperacionPayload;
  try {
    const decodificado = jwt.verify(tokenRecuperacion, JWT_SECRET);
    if (typeof decodificado !== "object" || !decodificado) throw new Error(" inválido");
    const o = decodificado as any;
    if (o.tipo !== "reset" || typeof o.rid !== "string" || typeof o.uid !== "number" || typeof o.correo !== "string") {
      throw new Error(" inválido");
    }
    payload = { tipo: "reset", rid: o.rid, uid: o.uid, correo: o.correo };
  } catch {
    return { status: 401, err: "Solicitud inválida o vencida." } as const;
  }

  const usuario = await prisma.usuarios.findUnique({ where: { id: payload.uid } });
  if (!usuario) return { status: 401, err: "Solicitud inválida o vencida." } as const;
  if (!usuario.estado) return { status: 403, err: "Usuario sin acceso." } as const;

  // Revalidar que el código (rid) no haya sido usado y que su exp no haya pasado
  const log = await prisma.logs.findFirst({
    where: { entidad: "auth", campo: "reset_pass", usuario_id: usuario.id },
    orderBy: { fecha_cambio: "desc" },
  });
  if (!log || !log.valor_nuevo) return { status: 401, err: "Solicitud inválida o vencida." } as const;

  let data: { rid: string; codeHash: string; exp: number };
  try {
    data = JSON.parse(log.valor_nuevo);
  } catch {
    return { status: 401, err: "Solicitud inválida o vencida." } as const;
  }

  // Debe coincidir el rid del token con el rid del último reset
  if (payload.rid !== data.rid) return { status: 401, err: "Solicitud inválida o vencida." } as const;

  const usado = await prisma.logs.findFirst({
    where: { entidad: "auth", campo: "reset_pass_ok", valor_nuevo: data.rid, usuario_id: usuario.id },
    select: { id: true },
  });
  if (usado) return { status: 401, err: "Solicitud inválida o vencida." } as const;

  if (Date.now() > data.exp) return { status: 401, err: "Solicitud inválida o vencida." } as const;

  // Actualizar contraseña
  const nuevoHash = await hashPassword(nuevaContrasena);
  await prisma.usuarios.update({
    where: { id: usuario.id },
    data: { contrasena_hash: nuevoHash, actualizado_en: new Date() },
  });

  // Marcar como usado
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

  return { status: 200, message: "Contraseña actualizada." } as const;
}

/* helper */
function generarCodigo6(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, "0");
}
