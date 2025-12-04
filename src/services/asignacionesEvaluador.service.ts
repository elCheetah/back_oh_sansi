// src/services/asignacionesEvaluador.service.ts
import prisma from "../config/database";

// ⚠️ Para evitar problemas de tipos con Prisma en este módulo:
const db: any = prisma;

export class ServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface CategoriaConAsignacionesDTO {
  categoriaId: number;
  areaId: number;
  areaNombre: string;
  nivelId: number;
  nivelNombre: string;
  modalidad: string;
  evaluadores: {
    id: number;
    nombreCompleto: string;
    correo: string;
    telefono?: string | null;
  }[];
}

/** Listar categorías de un área (un solo área, distintos niveles/modalidades) */
export async function listarCategoriasPorAreaSrv(
  areaId: number,
  gestion?: number
): Promise<{
  total: number;
  asignados: number;
  pendientes: number;
  categorias: CategoriaConAsignacionesDTO[];
}> {
  const categorias: any[] = await db.categorias.findMany({
    where: {
      area_id: areaId,
      estado: true,
      ...(gestion ? { gestion } : {}),
    },
    orderBy: [
      { nivel: { nombre: "asc" } },
      { modalidad: "asc" },
    ],
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
              correo: true,
              telefono: true,
            },
          },
        },
      },
    },
  });

  if (!categorias.length) {
    throw new ServiceError(
      "AREA_SIN_CATEGORIAS",
      "El área no tiene categorías configuradas para la gestión indicada.",
      404
    );
  }

  const categoriasDto: CategoriaConAsignacionesDTO[] = categorias.map(
    (cat: any): CategoriaConAsignacionesDTO => ({
      categoriaId: cat.id,
      areaId: cat.area.id,
      areaNombre: cat.area.nombre,
      nivelId: cat.nivel.id,
      nivelNombre: cat.nivel.nombre,
      modalidad: cat.modalidad,
      evaluadores: cat.asignaciones.map((asig: any) => ({
        id: asig.usuario.id,
        nombreCompleto: `${asig.usuario.nombre} ${
          asig.usuario.primer_apellido
        }${
          asig.usuario.segundo_apellido
            ? " " + asig.usuario.segundo_apellido
            : ""
        }`,
        correo: asig.usuario.correo,
        telefono: asig.usuario.telefono,
      })),
    })
  );

  const total = categoriasDto.length;
  const asignados = categoriasDto.filter((c) => c.evaluadores.length > 0).length;
  const pendientes = total - asignados;

  return { total, asignados, pendientes, categorias: categoriasDto };
}

/** Evaluadores disponibles para el modal (no repetidos) */
export async function listarEvaluadoresDisponiblesSrv(categoriaId: number) {
  const categoria = await db.categorias.findUnique({
    where: { id: categoriaId, estado: true },
  });

  if (!categoria) {
    throw new ServiceError(
      "CATEGORIA_NO_ENCONTRADA",
      "No se encontró la categoría indicada.",
      404
    );
  }

  const asignacionesActivas: any[] = await db.asignaciones.findMany({
    where: { categoria_id: categoriaId, estado: true },
    select: { usuario_id: true },
  });

  const idsAsignados = asignacionesActivas.map((a) => a.usuario_id);

  const evaluadores: any[] = await db.usuarios.findMany({
    where: {
      rol: "EVALUADOR",
      estado: true,
      ...(idsAsignados.length ? { id: { notIn: idsAsignados } } : {}),
    },
    orderBy: [
      { nombre: "asc" },
      { primer_apellido: "asc" },
      { segundo_apellido: "asc" },
    ],
  });

  return {
    evaluadores: evaluadores.map((u: any) => ({
      id: u.id,
      nombreCompleto: `${u.nombre} ${u.primer_apellido}${
        u.segundo_apellido ? " " + u.segundo_apellido : ""
      }`,
      correo: u.correo,
      telefono: u.telefono,
      institucion: u.institucion,
      profesion: u.profesion,
    })),
  };
}

/** Asignar evaluador principal (y opcional secundario) a categoría sin asignaciones previas */
export async function asignarEvaluadoresCategoriaSrv(params: {
  categoriaId: number;
  evaluadorPrincipalId: number;
  evaluadorSecundarioId?: number;
  indiceInicio?: number | null;
  indiceFin?: number | null;
}) {
  const {
    categoriaId,
    evaluadorPrincipalId,
    evaluadorSecundarioId,
    indiceInicio,
    indiceFin,
  } = params;

  const categoria = await db.categorias.findUnique({
    where: { id: categoriaId, estado: true },
  });

  if (!categoria) {
    throw new ServiceError(
      "CATEGORIA_NO_ENCONTRADA",
      "No se encontró la categoría indicada.",
      404
    );
  }

  const asignacionesExistentes = await db.asignaciones.count({
    where: { categoria_id: categoriaId, estado: true },
  });

  if (asignacionesExistentes > 0) {
    throw new ServiceError(
      "CATEGORIA_YA_ASIGNADA",
      "La categoría ya tiene evaluadores asignados. Use la opción de cambiar/agregar.",
      400
    );
  }

  const idsEvaluadores = [
    evaluadorPrincipalId,
    ...(evaluadorSecundarioId ? [evaluadorSecundarioId] : []),
  ];

  const evaluadores: any[] = await db.usuarios.findMany({
    where: {
      id: { in: idsEvaluadores },
      estado: true,
      rol: "EVALUADOR",
    },
  });

  if (evaluadores.length !== idsEvaluadores.length) {
    throw new ServiceError(
      "EVALUADOR_INVALIDO",
      "Uno o más evaluadores no son válidos o no están activos.",
      400
    );
  }

  const resultado = await db.$transaction(async (tx: any) => {
    const asignacionesCreadas: any[] = [];

    const principal = await tx.asignaciones.create({
      data: {
        usuario_id: evaluadorPrincipalId,
        categoria_id: categoriaId,
        indice_inicio: indiceInicio ?? null,
        indice_fin: indiceFin ?? null,
        estado: true,
      },
    });
    asignacionesCreadas.push(principal);

    if (evaluadorSecundarioId) {
      const secundario = await tx.asignaciones.create({
        data: {
          usuario_id: evaluadorSecundarioId,
          categoria_id: categoriaId,
          indice_inicio: null,
          indice_fin: null,
          estado: true,
        },
      });
      asignacionesCreadas.push(secundario);
    }

    return asignacionesCreadas;
  });

  return { asignaciones: resultado };
}

/** Agregar otro evaluador a una categoría que ya tiene alguno */
export async function agregarEvaluadorCategoriaSrv(params: {
  categoriaId: number;
  nuevoEvaluadorId: number;
  indiceInicio?: number | null;
  indiceFin?: number | null;
}) {
  const { categoriaId, nuevoEvaluadorId, indiceInicio, indiceFin } = params;

  const categoria = await db.categorias.findUnique({
    where: { id: categoriaId, estado: true },
  });

  if (!categoria) {
    throw new ServiceError(
      "CATEGORIA_NO_ENCONTRADA",
      "No se encontró la categoría indicada.",
      404
    );
  }

  const evaluador = await db.usuarios.findFirst({
    where: {
      id: nuevoEvaluadorId,
      estado: true,
      rol: "EVALUADOR",
    },
  });

  if (!evaluador) {
    throw new ServiceError(
      "EVALUADOR_INVALIDO",
      "El evaluador seleccionado no es válido.",
      400
    );
  }

  const yaAsignado = await db.asignaciones.findFirst({
    where: {
      categoria_id: categoriaId,
      usuario_id: nuevoEvaluadorId,
      estado: true,
    },
  });

  if (yaAsignado) {
    throw new ServiceError(
      "EVALUADOR_YA_ASIGNADO",
      "El evaluador ya está asignado a esta categoría.",
      400
    );
  }

  const asignacion = await db.asignaciones.create({
    data: {
      usuario_id: nuevoEvaluadorId,
      categoria_id: categoriaId,
      indice_inicio: indiceInicio ?? null,
      indice_fin: indiceFin ?? null,
      estado: true,
    },
  });

  return { asignacion };
}

/** Cambiar evaluador de una asignación concreta */
export async function cambiarEvaluadorSrv(params: {
  asignacionId: number;
  nuevoUsuarioId: number;
}) {
  const { asignacionId, nuevoUsuarioId } = params;

  const asignacion = await db.asignaciones.findUnique({
    where: { id: asignacionId },
  });

  if (!asignacion || !asignacion.estado) {
    throw new ServiceError(
      "ASIGNACION_NO_ENCONTRADA",
      "No se encontró la asignación indicada.",
      404
    );
  }

  const evaluador = await db.usuarios.findFirst({
    where: {
      id: nuevoUsuarioId,
      estado: true,
      rol: "EVALUADOR",
    },
  });

  if (!evaluador) {
    throw new ServiceError(
      "EVALUADOR_INVALIDO",
      "El evaluador seleccionado no es válido.",
      400
    );
  }

  const existeMismaCombinacion = await db.asignaciones.findFirst({
    where: {
      id: { not: asignacionId },
      categoria_id: asignacion.categoria_id,
      usuario_id: nuevoUsuarioId,
      estado: true,
    },
  });

  if (existeMismaCombinacion) {
    throw new ServiceError(
      "EVALUADOR_YA_ASIGNADO",
      "Ese evaluador ya está asignado a la categoría.",
      400
    );
  }

  const actualizada = await db.asignaciones.update({
    where: { id: asignacionId },
    data: {
      usuario_id: nuevoUsuarioId,
      estado: true,
    },
  });

  return { asignacion: actualizada };
}

/** Quitar asignación (soft delete: estado = false) */
export async function quitarAsignacionSrv(asignacionId: number) {
  const asignacion = await db.asignaciones.findUnique({
    where: { id: asignacionId },
  });

  if (!asignacion || !asignacion.estado) {
    throw new ServiceError(
      "ASIGNACION_NO_ENCONTRADA",
      "No se encontró la asignación indicada.",
      404
    );
  }

  const actualizada = await db.asignaciones.update({
    where: { id: asignacionId },
    data: { estado: false },
  });

  return { asignacion: actualizada };
}
