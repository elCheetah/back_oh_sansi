// src/services/gestionEvaluador.service.ts
import prisma from "../config/database";
import type { GestionEvaluadorDTO } from "../types/gestionEvaluador.types";

/** Mapea un registro de Usuarios a DTO para Gestión de Evaluador */
function mapUsuarioToGestionEvaluadorDTO(usuario: any): GestionEvaluadorDTO {
  const nombreCompleto = [
    usuario.nombre,
    usuario.ap_paterno,
    usuario.ap_materno ?? "",
  ]
    .join(" ")
    .trim();

  return {
    id: usuario.id,
    numeroDocumento: usuario.numero_documento,
    nombreCompleto,
    profesion: usuario.profesion,
    institucion: usuario.institucion,
    habilitado: usuario.estado,
  };
}

/** Lista todos los usuarios con rol EVALUADOR */
export async function listarGestionEvaluadoresService(): Promise<GestionEvaluadorDTO[]> {
  const usuarios = await prisma.usuarios.findMany({
    where: { rol: "EVALUADOR" },
    orderBy: [
      { ap_paterno: "asc" },
      { ap_materno: "asc" },
      { nombre: "asc" },
    ],
  });

  return usuarios.map(mapUsuarioToGestionEvaluadorDTO);
}

/** Actualiza el campo estado (habilitado/inhabilitado) de un evaluador */
export async function actualizarEstadoGestionEvaluadorService(
  id: number,
  habilitado: boolean
): Promise<GestionEvaluadorDTO> {
  const existe = await prisma.usuarios.findFirst({
    where: { id, rol: "EVALUADOR" },
  });

  if (!existe) {
    throw new Error("EVALUADOR_NO_ENCONTRADO");
  }

  const actualizado = await prisma.usuarios.update({
    where: { id },
    data: { estado: habilitado },
  });

  return mapUsuarioToGestionEvaluadorDTO(actualizado);
}
