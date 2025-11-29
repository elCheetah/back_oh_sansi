// services/evaluador.service.ts
import prisma from '../config/database';
import { RegistroEvaluadorDTO } from '../types/evaluador.types';
import { hashPassword } from '../utils/password';
import { enviarCorreoBienvenida } from '../utils/mailer';

export async function registrarEvaluador(dto: RegistroEvaluadorDTO) {
  // Validar duplicado por correo
  const existeCorreo = await prisma.usuarios.findUnique({
    where: { correo: dto.correo },
  });
  if (existeCorreo) {
    return { ok: false, status: 409, error: 'El correo ya está registrado' };
  }

  // Validar duplicado por documento
  const existeDoc = await prisma.usuarios.findFirst({
    where: {
      tipo_documento: dto.tipo_documento,
      numero_documento: dto.numero_documento,
    },
  });
  if (existeDoc) {
    return { ok: false, status: 409, error: 'Ya existe un usuario con el mismo documento' };
  }

  // Hashear la contraseña (ignorar confirmPassword)
  const hash = await hashPassword(dto.password);

  const usuario = await prisma.usuarios.create({
    data: {
      nombre: dto.nombre,
      ap_paterno: dto.ap_paterno,
      ap_materno: dto.ap_materno ?? null,
      tipo_documento: dto.tipo_documento,
      numero_documento: dto.numero_documento,
      correo: dto.correo,
      telefono: dto.telefono ?? null,
      contrasena_hash: hash,
      rol: 'EVALUADOR',
      estado: false,
    },
  });

  //Enviar correo de bienvenida al usuario
  try {
    await enviarCorreoBienvenida(usuario.correo, usuario.nombre);
  } catch (e) {
    console.warn('No se pudo enviar el correo de bienvenida:', (e as Error).message);
  }

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
      estado: usuario.estado,
      rol: usuario.rol,
      creado_en: usuario.creado_en,
      mensaje: 'Registro exitoso. Se envió un correo de bienvenida.',
    },
  };
}

