import prisma from "../config/database";
import { RegistroEvaluadorDTO } from "../types/evaluador.types";
import { hashPassword } from "../utils/password";
import { enviarCorreoBienvenida } from "../utils/mailer";
import { Rol } from "@prisma/client";

export async function registrarEvaluador(dto: RegistroEvaluadorDTO) {
  console.log("DTO REGISTRO EVALUADOR =>", dto);

  // 1. Validar duplicado por correo
  const existeCorreo = await prisma.usuarios.findUnique({
    where: { correo: dto.correo.toLowerCase().trim() },
  });
  if (existeCorreo) {
    return { ok: false, status: 409, error: "El correo ya está registrado" };
  }

  // 2. Validar duplicado por documento
  const existeDoc = await prisma.usuarios.findFirst({
    where: {
      tipo_documento: dto.tipo_documento,
      numero_documento: dto.numero_documento.trim(),
    },
  });
  if (existeDoc) {
    return {
      ok: false,
      status: 409,
      error: "Ya existe un usuario con el mismo documento",
    };
  }

  // 3. Hashear la contraseña
  const hash = await hashPassword(dto.password);

  // 4. Crear usuario con los nombres correctos del modelo
  const usuario = await prisma.usuarios.create({
    data: {
      nombre: dto.nombre.trim(),
      primer_apellido: dto.ap_paterno.trim(),
      segundo_apellido: dto.ap_materno?.trim() ?? null,
      tipo_documento: dto.tipo_documento,
      numero_documento: dto.numero_documento.trim(),
      correo: dto.correo.toLowerCase().trim(),
      telefono: dto.telefono?.trim() ?? null,

      profesion: dto.profesion?.trim() ?? null,
      institucion: dto.institucion?.trim() ?? null,
      cargo: dto.cargo?.trim() ?? null,

      contrasena_hash: hash,
      rol: Rol.EVALUADOR,
      estado: false,
    },
  });

  // 5. Enviar correo (si falla, no rompe el registro)
  try {
    await enviarCorreoBienvenida(usuario.correo, usuario.nombre);
  } catch (e) {
    console.warn(
      "No se pudo enviar el correo de bienvenida:",
      (e as Error).message
    );
  }

  // 6. Respuesta
  return {
    ok: true,
    status: 201,
    data: {
      id: usuario.id,
      nombre: usuario.nombre,
      ap_paterno: usuario.primer_apellido,
      ap_materno: usuario.segundo_apellido,
      correo: usuario.correo,
      telefono: usuario.telefono,
      profesion: usuario.profesion,
      institucion: usuario.institucion,
      cargo: usuario.cargo,
      estado: usuario.estado,
      rol: usuario.rol,
      creado_en: usuario.creado_en,
      mensaje: "Registro exitoso. Se envió un correo de bienvenida.",
    },
  };
}
