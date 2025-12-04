// src/services/categorias.service.ts
import prismaClient from "../config/database";
const prisma: any = prismaClient; // 👈 prisma como any para evitar errores de tipos

import { Rol } from "@prisma/client";

type FiltroCategorias = {
  gestion?: number;
};

export async function listarCategoriasSrv(filtro: FiltroCategorias) {
  const { gestion } = filtro;

  const categorias = await prisma.categorias.findMany({
    where: {
      estado: true,
      ...(gestion ? { gestion } : {}),
    },
    include: {
      area: { select: { id: true, nombre: true } },
      nivel: { select: { id: true, nombre: true } },
      asignaciones: {
        where: { estado: true },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              primer_apellido: true,
              segundo_apellido: true,
            },
          },
        },
      },
    },
    orderBy: [
      { area: { nombre: "asc" } },
      { nivel: { nombre: "asc" } },
      { modalidad: "asc" },
    ],
  });

  return categorias.map((cat: any) => {
    const asignacion = cat.asignaciones[0];

    const responsable = asignacion
      ? {
        id: asignacion.usuario.id,
        nombreCompleto: [
          asignacion.usuario.nombre,
          asignacion.usuario.primer_apellido,
          asignacion.usuario.segundo_apellido,
        ]
          .filter(Boolean)
          .join(" "),
      }
      : null;

    return {
      id: cat.id,
      gestion: cat.gestion,
      area: cat.area,
      nivel: cat.nivel,
      modalidad: cat.modalidad,
      nota_min_clasificacion: cat.nota_min_clasificacion,
      oros_final: cat.oros_final,
      platas_final: cat.platas_final,
      bronces_final: cat.bronces_final,
      menciones_final: cat.menciones_final,
      creado_en: cat.creado_en,
      responsable,
    };
  });
}

type CrearCategoriaPayload = {
  gestion: number;
  area_id: number;
  nivel_id: number;
  modalidad: "INDIVIDUAL" | "GRUPAL";
  nota_min_clasificacion?: number;
  oros_final?: number;
  platas_final?: number;
  bronces_final?: number;
  menciones_final?: number;
};

export async function crearCategoriaSrv(payload: CrearCategoriaPayload) {
  const {
    gestion,
    area_id,
    nivel_id,
    modalidad,
    nota_min_clasificacion,
    oros_final,
    platas_final,
    bronces_final,
    menciones_final,
  } = payload;

  const [area, nivel] = await Promise.all([
    prisma.areas.findFirst({ where: { id: area_id, estado: true } }),
    prisma.niveles.findFirst({ where: { id: nivel_id, estado: true } }),
  ]);

  if (!area) {
    throw {
      codigo: "AREA_NO_ENCONTRADA",
      mensaje: "El área indicada no existe o está inactiva",
    };
  }

  if (!nivel) {
    throw {
      codigo: "NIVEL_NO_ENCONTRADO",
      mensaje: "El nivel indicado no existe o está inactivo",
    };
  }

  const categoria = await prisma.categorias.create({
    data: {
      gestion,
      area_id,
      nivel_id,
      modalidad: modalidad as any, // enum ModalidadCategoria
      nota_min_clasificacion: nota_min_clasificacion ?? 51,
      oros_final: oros_final ?? 1,
      platas_final: platas_final ?? 1,
      bronces_final: bronces_final ?? 1,
      menciones_final: menciones_final ?? 0,
    },
    include: {
      area: { select: { id: true, nombre: true } },
      nivel: { select: { id: true, nombre: true } },
    },
  });

  return {
    id: categoria.id,
    gestion: categoria.gestion,
    area: categoria.area,
    nivel: categoria.nivel,
    modalidad: categoria.modalidad,
    nota_min_clasificacion: categoria.nota_min_clasificacion,
    oros_final: categoria.oros_final,
    platas_final: categoria.platas_final,
    bronces_final: categoria.bronces_final,
    menciones_final: categoria.menciones_final,
    creado_en: categoria.creado_en,
    responsable: null,
  };
}

export async function eliminarCategoriaSrv(idCategoria: number) {
  const tieneParticipaciones = await prisma.participacion.count({
    where: { categoria_id: idCategoria },
  });

  if (tieneParticipaciones > 0) {
    throw {
      codigo: "CATEGORIA_CON_PARTICIPACION",
      mensaje:
        "No se puede eliminar la categoría porque ya tiene participaciones registradas",
    };
  }

  const categoria = await prisma.categorias.findUnique({
    where: { id: idCategoria },
  });

  if (!categoria) return null;

  await prisma.categorias.update({
    where: { id: idCategoria },
    data: { estado: false },
  });

  return true;
}

export async function asignarResponsableCategoriaSrv(
  idCategoria: number,
  usuarioId: number
) {
  const categoria = await prisma.categorias.findUnique({
    where: { id: idCategoria },
    include: {
      area: { select: { id: true, nombre: true } },
      nivel: { select: { id: true, nombre: true } },
    },
  });

  if (!categoria || !categoria.estado) {
    throw {
      codigo: "CATEGORIA_NO_ENCONTRADA",
      mensaje: "La categoría no existe o está inactiva",
    };
  }

  const usuario = await prisma.usuarios.findFirst({
    where: { id: usuarioId, estado: true },
  });

  if (!usuario) {
    throw {
      codigo: "USUARIO_NO_ENCONTRADO",
      mensaje: "El responsable indicado no existe o está inactivo",
    };
  }

  if (usuario.rol !== Rol.RESPONSABLE) {
    throw {
      codigo: "ROL_INCORRECTO",
      mensaje: "Solo usuarios con rol RESPONSABLE pueden ser asignados",
    };
  }

  const asignacionExistenteUsuario = await prisma.asignaciones.findFirst({
    where: {
      usuario_id: usuarioId,
      estado: true,
    },
    include: { categoria: true },
  });

  if (
    asignacionExistenteUsuario &&
    asignacionExistenteUsuario.categoria_id !== idCategoria
  ) {
    throw {
      codigo: "RESPONSABLE_YA_ASIGNADO",
      mensaje:
        "Este responsable ya está asignado a otra categoría y no puede repetirse",
    };
  }

  const asignacionActual = await prisma.asignaciones.findFirst({
    where: { categoria_id: idCategoria, estado: true },
  });

  if (!asignacionActual || asignacionActual.usuario_id !== usuarioId) {
    await prisma.$transaction(async (tx: any) => {
      if (asignacionActual) {
        await tx.asignaciones.update({
          where: { id: asignacionActual.id },
          data: { estado: false },
        });
      }

      await tx.asignaciones.create({
        data: {
          usuario_id: usuarioId,
          categoria_id: idCategoria,
          estado: true,
          indice_inicio: null,
          indice_fin: null,
        },
      });
    });
  }

  const categoriaConAsignacion = await prisma.categorias.findUnique({
    where: { id: idCategoria },
    include: {
      area: { select: { id: true, nombre: true } },
      nivel: { select: { id: true, nombre: true } },
      asignaciones: {
        where: { estado: true },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              primer_apellido: true,
              segundo_apellido: true,
            },
          },
        },
      },
    },
  });

  const asignacion = categoriaConAsignacion?.asignaciones[0];

  const responsable = asignacion
    ? {
      id: asignacion.usuario.id,
      nombreCompleto: [
        asignacion.usuario.nombre,
        asignacion.usuario.primer_apellido,
        asignacion.usuario.segundo_apellido,
      ]
        .filter(Boolean)
        .join(" "),
    }
    : null;

  return {
    id: categoriaConAsignacion!.id,
    gestion: categoriaConAsignacion!.gestion,
    area: categoriaConAsignacion!.area,
    nivel: categoriaConAsignacion!.nivel,
    modalidad: categoriaConAsignacion!.modalidad,
    nota_min_clasificacion:
      categoriaConAsignacion!.nota_min_clasificacion,
    oros_final: categoriaConAsignacion!.oros_final,
    platas_final: categoriaConAsignacion!.platas_final,
    bronces_final: categoriaConAsignacion!.bronces_final,
    menciones_final: categoriaConAsignacion!.menciones_final,
    creado_en: categoriaConAsignacion!.creado_en,
    responsable,
  };
}

type FiltroResponsablesDisponibles = {
  gestion?: number;
};

export async function listarResponsablesDisponiblesSrv(
  filtro: FiltroResponsablesDisponibles
) {
  const { gestion } = filtro;

  const responsables = await prisma.usuarios.findMany({
    where: {
      estado: true,
      rol: Rol.RESPONSABLE,
      asignaciones: {
        none: {
          estado: true,
          ...(gestion
            ? {
              categoria: {
                gestion,
              },
            }
            : {}),
        },
      },
    },
    select: {
      id: true,
      nombre: true,
      primer_apellido: true,
      segundo_apellido: true,
      correo: true,
    },
    orderBy: [
      { primer_apellido: "asc" },
      { segundo_apellido: "asc" },
      { nombre: "asc" },
    ],
  });

  return responsables.map((u: any) => ({
    id: u.id,
    nombreCompleto: [u.nombre, u.primer_apellido, u.segundo_apellido]
      .filter(Boolean)
      .join(" "),
    correo: u.correo,
  }));
}
