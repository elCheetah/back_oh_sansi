import prismaClient from "../config/database";
const prisma: any = prismaClient;

import { Rol } from "@prisma/client";

type FiltroCategorias = {
  gestion?: number;
};

type ResponsableDTO = {
  id: number;
  nombreCompleto: string;
} | null;

type CategoriaDTO = {
  id: number;
  gestion: number;
  area: { id: number; nombre: string };
  nivel: { id: number; nombre: string };
  modalidad: string;
  nota_min_clasificacion: number;
  oros_final: number;
  platas_final: number;
  bronces_final: number;
  menciones_final: number;
  creado_en: Date;
  responsable: ResponsableDTO;
};

export async function listarCategoriasSrv(
  filtro: FiltroCategorias
): Promise<CategoriaDTO[]> {
  const { gestion } = filtro;

  const categorias = await prisma.categorias.findMany({
    where: {
      estado: true,
      ...(gestion ? { gestion } : {}),
    },
    include: {
      area: { select: { id: true, nombre: true, estado: true } },
      nivel: { select: { id: true, nombre: true, estado: true } },
      asignaciones: {
        where: { estado: true },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              primer_apellido: true,
              segundo_apellido: true,
              estado: true,
              rol: true,              // 👈 IMPORTANTE: traemos el rol
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
    // 👇 Sólo consideramos como responsable a un usuario con rol RESPONSABLE
    const asignacionResponsable = cat.asignaciones.find(
      (a: any) =>
        a.usuario &&
        a.usuario.estado &&
        a.usuario.rol === Rol.RESPONSABLE
    );

    const responsable: ResponsableDTO = asignacionResponsable
      ? {
          id: asignacionResponsable.usuario.id,
          nombreCompleto: [
            asignacionResponsable.usuario.nombre,
            asignacionResponsable.usuario.primer_apellido,
            asignacionResponsable.usuario.segundo_apellido,
          ]
            .filter(Boolean)
            .join(" "),
        }
      : null; // 👈 Si no hay responsable, va null

    return {
      id: cat.id,
      gestion: cat.gestion,
      area: { id: cat.area.id, nombre: cat.area.nombre },
      nivel: { id: cat.nivel.id, nombre: cat.nivel.nombre },
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
  gestion?: number;
  area_id: number;
  nivel_id: number;
  modalidad: "INDIVIDUAL" | "GRUPAL";
};

// Crea o reactiva categoría (si existe misma combinación pero estado=false)
export async function crearCategoriaSrv(payload: CrearCategoriaPayload): Promise<{
  categoria: CategoriaDTO;
  reactivada: boolean;
}> {
  const { gestion, area_id, nivel_id, modalidad } = payload;

  const gestionReal = gestion ?? new Date().getFullYear();

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

  // Busco si ya existe la categoría (única por gestion+area+nivel+modalidad)
  const existente = await prisma.categorias.findUnique({
    where: {
      gestion_area_id_nivel_id_modalidad: {
        gestion: gestionReal,
        area_id,
        nivel_id,
        modalidad,
      },
    },
  });

  let categoriaDb: any;
  let reactivada = false;

  if (!existente) {
    categoriaDb = await prisma.categorias.create({
      data: {
        gestion: gestionReal,
        area_id,
        nivel_id,
        modalidad,
        nota_min_clasificacion: 51,
        oros_final: 1,
        platas_final: 1,
        bronces_final: 1,
        menciones_final: 0,
        estado: true,
      },
      include: {
        area: { select: { id: true, nombre: true } },
        nivel: { select: { id: true, nombre: true } },
      },
    });
  } else if (existente && !existente.estado) {
    // Reactivar categoría lógica
    categoriaDb = await prisma.categorias.update({
      where: { id: existente.id },
      data: {
        estado: true,
        nota_min_clasificacion: 51,
        oros_final: 1,
        platas_final: 1,
        bronces_final: 1,
        menciones_final: 0,
      },
      include: {
        area: { select: { id: true, nombre: true } },
        nivel: { select: { id: true, nombre: true } },
      },
    });
    reactivada = true;
  } else {
    // Ya existe y está activa
    throw {
      codigo: "CATEGORIA_DUPLICADA",
      mensaje:
        "Ya existe una categoría activa con esa gestión, área, nivel y modalidad",
    };
  }

  const categoria: CategoriaDTO = {
    id: categoriaDb.id,
    gestion: categoriaDb.gestion,
    area: { id: categoriaDb.area.id, nombre: categoriaDb.area.nombre },
    nivel: { id: categoriaDb.nivel.id, nombre: categoriaDb.nivel.nombre },
    modalidad: categoriaDb.modalidad,
    nota_min_clasificacion: categoriaDb.nota_min_clasificacion,
    oros_final: categoriaDb.oros_final,
    platas_final: categoriaDb.platas_final,
    bronces_final: categoriaDb.bronces_final,
    menciones_final: categoriaDb.menciones_final,
    creado_en: categoriaDb.creado_en,
    responsable: null,
  };

  return { categoria, reactivada };
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

  await prisma.$transaction(async (tx: any) => {
    // Eliminación lógica de categoría
    await tx.categorias.update({
      where: { id: idCategoria },
      data: { estado: false },
    });

    // Desactivar asignaciones asociadas
    await tx.asignaciones.updateMany({
      where: { categoria_id: idCategoria, estado: true },
      data: { estado: false },
    });
  });

  return true;
}

export async function asignarResponsableCategoriaSrv(
  idCategoria: number,
  usuarioId: number
): Promise<{ categoria: CategoriaDTO; responsableAnteriorId: number | null }> {
  const categoria = await prisma.categorias.findUnique({
    where: { id: idCategoria },
    include: {
      area: { select: { id: true, nombre: true, estado: true } },
      nivel: { select: { id: true, nombre: true, estado: true } },
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

  if (usuario.rol === Rol.ADMINISTRADOR) {
    throw {
      codigo: "ROL_INVALIDO",
      mensaje: "No se puede asignar un ADMINISTRADOR como responsable",
    };
  }

  // Todas las asignaciones (activas o no) de este usuario
  const asignacionesUsuario = await prisma.asignaciones.findMany({
    where: { usuario_id: usuarioId },
    orderBy: { id: "asc" },
  });

  // Asignación actual de la categoría (responsable actual, si hay)
  const asignacionActualCategoria = await prisma.asignaciones.findFirst({
    where: { categoria_id: idCategoria, estado: true },
  });

  const responsableAnteriorId: number | null =
    asignacionActualCategoria?.usuario_id ?? null;

  await prisma.$transaction(async (tx: any) => {
    // Si era EVALUADOR, al asignar se vuelve RESPONSABLE
    if (usuario.rol === Rol.EVALUADOR) {
      await tx.usuarios.update({
        where: { id: usuarioId },
        data: { rol: Rol.RESPONSABLE },
      });
    }

    // ====== Elegir / crear la ÚNICA fila de asignación para este usuario ======
    // Preferimos una asignación que ya tenga esta categoría si existe
    let baseAsignacion =
      asignacionesUsuario.find(
        (a: any) => a.categoria_id === idCategoria
      ) ?? asignacionesUsuario[0] ?? null;

    if (baseAsignacion) {
      // Eliminar cualquier otra fila de asignación de este usuario
      const idsEliminar = asignacionesUsuario
        .filter((a: any) => a.id !== baseAsignacion.id)
        .map((a: any) => a.id);

      if (idsEliminar.length > 0) {
        await tx.asignaciones.deleteMany({
          where: { id: { in: idsEliminar } },
        });
      }

      // Reutilizar la fila base: moverla a esta categoría y activarla
      baseAsignacion = await tx.asignaciones.update({
        where: { id: baseAsignacion.id },
        data: {
          categoria_id: idCategoria,
          estado: true,
          indice_inicio: null,
          indice_fin: null,
        },
      });
    } else {
      // No tenía ninguna fila en asignaciones → crear la primera y única
      baseAsignacion = await tx.asignaciones.create({
        data: {
          usuario_id: usuarioId,
          categoria_id: idCategoria,
          estado: true,
          indice_inicio: null,
          indice_fin: null,
        },
      });
    }

    // ====== Eliminar responsable anterior de esta categoría (si es otro) ======
    if (
      asignacionActualCategoria &&
      asignacionActualCategoria.id !== baseAsignacion.id
    ) {
      await tx.asignaciones.delete({
        where: { id: asignacionActualCategoria.id },
      });
    }
  });

  // Volvemos a leer la categoría ya con el responsable actualizado
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

  const responsable: ResponsableDTO = asignacion
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

  const categoriaDTO: CategoriaDTO = {
    id: categoriaConAsignacion!.id,
    gestion: categoriaConAsignacion!.gestion,
    area: {
      id: categoriaConAsignacion!.area.id,
      nombre: categoriaConAsignacion!.area.nombre,
    },
    nivel: {
      id: categoriaConAsignacion!.nivel.id,
      nombre: categoriaConAsignacion!.nivel.nombre,
    },
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

  return {
    categoria: categoriaDTO,
    responsableAnteriorId,
  };
}


type FiltroResponsablesDisponibles = {
  gestion?: number;
};

// Usuarios disponibles para ser responsables:
// - estado=true
// - rol EVALUADOR o RESPONSABLE (nunca ADMINISTRADOR)
// - sin NINGUNA asignación activa (estado=true) en asignaciones
export async function listarResponsablesDisponiblesSrv(
  _filtro: FiltroResponsablesDisponibles
) {
  const usuarios = await prisma.usuarios.findMany({
    where: {
      estado: true,
      rol: { in: [Rol.EVALUADOR, Rol.RESPONSABLE] },
      asignaciones: {
        none: {
          estado: true,
        },
      },
    },
    select: {
      id: true,
      nombre: true,
      primer_apellido: true,
      segundo_apellido: true,
    },
    orderBy: [
      { primer_apellido: "asc" },
      { segundo_apellido: "asc" },
      { nombre: "asc" },
    ],
  });

  return usuarios.map((u: any) => ({
    id: u.id,
    nombreCompleto: [u.nombre, u.primer_apellido, u.segundo_apellido]
      .filter(Boolean)
      .join(" "),
  }));
}

// Catálogo áreas activas
export async function listarAreasActivasSrv() {
  const areas = await prisma.areas.findMany({
    where: { estado: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return areas;
}

// Catálogo niveles activos
export async function listarNivelesActivosSrv() {
  const niveles = await prisma.niveles.findMany({
    where: { estado: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return niveles;
}
