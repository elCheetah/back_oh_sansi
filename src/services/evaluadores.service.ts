// src/services/evaluadores.service.ts
import prismaClient from "../config/database";
import { Rol } from "@prisma/client";

const prisma: any = prismaClient;

export async function listarEvaluadoresSrv() {
  const evaluadores = await prisma.usuarios.findMany({
    where: {
      rol: Rol.EVALUADOR,
    },
    include: {
      asignaciones: {
        where: {
          estado: true,
          categoria: {
            estado: true,
            area: { estado: true },
            nivel: { estado: true },
          },
        },
        include: {
          categoria: {
            include: {
              area: { select: { nombre: true } },
              nivel: { select: { nombre: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { primer_apellido: "asc" },
      { segundo_apellido: "asc" },
      { nombre: "asc" },
    ],
  });

  return evaluadores;
}

export async function actualizarEstadoEvaluadorSrv(
  idUsuario: number,
  nuevoEstado: boolean
) {
  const usuario = await prisma.usuarios.findUnique({
    where: { id: idUsuario },
  });

  if (!usuario) {
    throw {
      codigo: "USUARIO_NO_ENCONTRADO",
      mensaje: "El evaluador no existe",
    };
  }

  if (usuario.rol !== Rol.EVALUADOR) {
    throw {
      codigo: "USUARIO_NO_EVALUADOR",
      mensaje: "Solo se puede cambiar el estado de usuarios con rol EVALUADOR",
    };
  }

  const usuarioActualizado = await prisma.usuarios.update({
    where: { id: idUsuario },
    data: {
      estado: nuevoEstado,
      actualizado_en: new Date(),
    },
  });

  return {
    usuarioAntes: usuario,
    usuarioDespues: usuarioActualizado,
  };
}
