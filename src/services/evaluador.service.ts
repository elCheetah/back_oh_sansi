// services/evaluador.service.ts
import prisma from '../config/database';
import { RegistroEvaluadorDTO } from '../types/evaluador.types';
import { hashPassword } from '../utils/password';
import { enviarCorreoBienvenida } from '../utils/mailer';

export async function registrarEvaluador(dto: RegistroEvaluadorDTO) {
  // 👉 LOG para verificar exactamente qué llega desde el controller
  console.log('DTO REGISTRO EVALUADOR =>', dto);
  console.log('Campos extra =>', {
    profesion: dto.profesion,
    institucion: dto.institucion,
    cargo: dto.cargo,
  });

  // 1. Validar duplicado por correo
  const existeCorreo = await prisma.usuarios.findUnique({
    where: { correo: dto.correo },
  });
  if (existeCorreo) {
    return { ok: false, status: 409, error: 'El correo ya está registrado' };
  }

  // 2. Validar duplicado por documento
  const existeDoc = await prisma.usuarios.findFirst({
    where: {
      tipo_documento: dto.tipo_documento,
      numero_documento: dto.numero_documento,
    },
  });
  if (existeDoc) {
    return {
      ok: false,
      status: 409,
      error: 'Ya existe un usuario con el mismo documento',
    };
  }

  // 3. Hashear la contraseña
  const hash = await hashPassword(dto.password);

  // 4. Crear usuario con profesión / institución / cargo
  const usuario = await prisma.usuarios.create({
    data: {
      nombre: dto.nombre.trim(),
      ap_paterno: dto.ap_paterno.trim(),
      ap_materno: dto.ap_materno?.trim() ?? null,
      tipo_documento: dto.tipo_documento,
      numero_documento: dto.numero_documento,
      correo: dto.correo.toLowerCase().trim(),
      telefono: dto.telefono ?? null,

      // 👇 estos tres son los importantes
      profesion: dto.profesion?.trim() ?? null,
      institucion: dto.institucion?.trim() ?? null,
      cargo: dto.cargo?.trim() ?? null,

      contrasena_hash: hash,
      rol: 'EVALUADOR',
      estado: false, // empieza inhabilitado
    },
  });

  // 5. Enviar correo (si falla, no rompemos el registro)
  try {
    await enviarCorreoBienvenida(usuario.correo, usuario.nombre);
  } catch (e) {
    console.warn(
      'No se pudo enviar el correo de bienvenida:',
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
      ap_paterno: usuario.ap_paterno,
      ap_materno: usuario.ap_materno,
      correo: usuario.correo,
      telefono: usuario.telefono,
      profesion: usuario.profesion,
      institucion: usuario.institucion,
      cargo: usuario.cargo,
      estado: usuario.estado,
      rol: usuario.rol,
      creado_en: usuario.creado_en,
      mensaje: 'Registro exitoso. Se envió un correo de bienvenida.',
    },
  };
}
