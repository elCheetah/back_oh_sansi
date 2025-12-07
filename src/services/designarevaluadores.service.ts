import prisma from "../config/database";

type CategoriaConEvaluadoresDTO = {
  idCategoria: number;
  area: string;
  nivel: string;
  modalidad: string;
  evaluadores: EvaluadorAsignadoDTO[];
};

type EvaluadorAsignadoDTO = {
  idEvaluador: number;
  ci: string;
  nombreCompleto: string;
  apellidoIndiceInicialParticipacion: string | null;
  apellidoIndiceFinalParticipacion: string | null;
};

type EvaluadorDisponibleDTO = {
  idEvaluador: number;
  nombreCompleto: string;
};

type GestionFiltro = {
  gestion?: number;
};

function buildNombreCompletoUsuario(u: {
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
}): string {
  return `${u.nombre} ${u.primer_apellido}${
    u.segundo_apellido ? " " + u.segundo_apellido : ""
  }`.trim();
}

function etiquetaParticipacion(p: any): string | null {
  if (p.olimpista) {
    return p.olimpista.primer_apellido || null;
  }
  if (p.equipo) {
    return p.equipo.nombre || null;
  }
  return null;
}

// ===============================
// Redistribuir indices participaciones
// ===============================

async function redistribuirParticipaciones(categoriaId: number): Promise<void> {
  const participaciones = await prisma.participacion.findMany({
    where: { categoria_id: categoriaId },
    orderBy: { id: "asc" },
  });

  const total = participaciones.length;

  const asignacionesActivas = await prisma.asignaciones.findMany({
    where: { categoria_id: categoriaId, estado: true },
    orderBy: { id: "asc" },
  });

  if (!asignacionesActivas.length || !total) {
    // Si no hay participaciones o no hay evaluadores activos,
    // limpiamos índices de todas las asignaciones de la categoría
    await prisma.asignaciones.updateMany({
      where: { categoria_id: categoriaId },
      data: { indice_inicio: null, indice_fin: null },
    });
    return;
  }

  const evaluadoresCount = asignacionesActivas.length;
  const base = Math.floor(total / evaluadoresCount);
  const resto = total % evaluadoresCount;

  let indiceActual = 1;

  for (let i = 0; i < asignacionesActivas.length; i++) {
    const asignacion = asignacionesActivas[i];

    let cantidad = base;
    // El sobrante se asigna al primer evaluador
    if (i === 0) {
      cantidad += resto;
    }

    const inicio = cantidad > 0 ? indiceActual : null;
    const fin = cantidad > 0 ? indiceActual + cantidad - 1 : null;

    await prisma.asignaciones.update({
      where: { id: asignacion.id },
      data: {
        indice_inicio: inicio,
        indice_fin: fin,
      },
    });

    indiceActual += cantidad;
  }
}

// ===============================
// GET Categorías con evaluadores asignados
// ===============================

export async function listarCategoriasConEvaluadoresSrv(
  filtros: GestionFiltro
): Promise<CategoriaConEvaluadoresDTO[]> {
  const currentYear = new Date().getFullYear();
  const gestion = filtros.gestion ?? currentYear;

  const categorias = await prisma.categorias.findMany({
    where: {
      gestion,
      estado: true,
      area: { estado: true },
      nivel: { estado: true },
    },
    include: {
      area: true,
      nivel: true,
      asignaciones: {
        where: { estado: true },
        include: {
          usuario: true,
        },
        orderBy: { id: "asc" },
      },
      participaciones: {
        include: {
          olimpista: true,
          equipo: true,
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: [
      { area: { nombre: "asc" } },
      { nivel: { nombre: "asc" } },
      { modalidad: "asc" },
    ],
  });

  const resultado: CategoriaConEvaluadoresDTO[] = categorias.map((cat) => {
    const totalPart = cat.participaciones.length;

    const evaluadores: EvaluadorAsignadoDTO[] = cat.asignaciones.map(
      (asig) => {
        let apellidoInicio: string | null = null;
        let apellidoFin: string | null = null;

        if (
          asig.indice_inicio &&
          asig.indice_inicio >= 1 &&
          asig.indice_inicio <= totalPart
        ) {
          const pIni = cat.participaciones[asig.indice_inicio - 1];
          apellidoInicio = pIni ? etiquetaParticipacion(pIni) : null;
        }

        if (
          asig.indice_fin &&
          asig.indice_fin >= 1 &&
          asig.indice_fin <= totalPart
        ) {
          const pFin = cat.participaciones[asig.indice_fin - 1];
          apellidoFin = pFin ? etiquetaParticipacion(pFin) : null;
        }

        const u = asig.usuario;

        return {
          idEvaluador: u.id,
          ci: u.numero_documento,
          nombreCompleto: buildNombreCompletoUsuario({
            nombre: u.nombre,
            primer_apellido: u.primer_apellido,
            segundo_apellido: u.segundo_apellido,
          }),
          apellidoIndiceInicialParticipacion: apellidoInicio,
          apellidoIndiceFinalParticipacion: apellidoFin,
        };
      }
    );

    return {
      idCategoria: cat.id,
      area: cat.area.nombre,
      nivel: cat.nivel.nombre,
      modalidad: cat.modalidad,
      evaluadores,
    };
  });

  return resultado;
}

// ===============================
// GET Evaluadores disponibles para una categoría
// ===============================

export async function listarEvaluadoresDisponiblesSrv(
  categoriaId: number,
  q?: string
): Promise<EvaluadorDisponibleDTO[]> {
  const categoria = await prisma.categorias.findUnique({
    where: { id: categoriaId },
    select: { id: true, estado: true },
  });

  if (!categoria || !categoria.estado) {
    throw {
      codigo: "CATEGORIA_NO_ENCONTRADA",
      mensaje: "La categoría no existe o está inactiva.",
    };
  }

  const asignacionesCategoria = await prisma.asignaciones.findMany({
    where: {
      categoria_id: categoriaId,
      estado: true,
    },
    select: {
      usuario_id: true,
    },
  });

  const idsAsignados = new Set(
    asignacionesCategoria.map((a) => a.usuario_id)
  );

  const evaluadores = await prisma.usuarios.findMany({
    where: {
      rol: "EVALUADOR",
      estado: true,
    },
    include: {
      asignaciones: {
        where: { estado: true },
      },
    },
    orderBy: [{ nombre: "asc" }, { primer_apellido: "asc" }],
  });

  const filtrados = evaluadores.filter((u) => {
    const activas = u.asignaciones.filter((a) => a.estado).length;

    if (activas >= 5) return false; // ya llegó a su límite global
    if (idsAsignados.has(u.id)) return false; // ya está asignado en esta categoría

    const nombreCompleto = buildNombreCompletoUsuario({
      nombre: u.nombre,
      primer_apellido: u.primer_apellido,
      segundo_apellido: u.segundo_apellido,
    });

    if (q && q.trim()) {
      const term = q.toLowerCase();
      const hayCoincidencia =
        nombreCompleto.toLowerCase().includes(term) ||
        u.numero_documento.toLowerCase().includes(term);

      if (!hayCoincidencia) return false;
    }

    return true;
  });

  return filtrados.map((u) => ({
    idEvaluador: u.id,
    nombreCompleto: buildNombreCompletoUsuario({
      nombre: u.nombre,
      primer_apellido: u.primer_apellido,
      segundo_apellido: u.segundo_apellido,
    }),
  }));
}

// ===============================
// Asignar evaluador a categoría
// ===============================

export async function asignarEvaluadorCategoriaSrv(
  categoriaId: number,
  evaluadorId: number,
  usuarioAuthId: number
) {
  const categoria = await prisma.categorias.findUnique({
    where: { id: categoriaId },
    include: {
      area: true,
      nivel: true,
    },
  });

  if (!categoria || !categoria.estado) {
    throw {
      codigo: "CATEGORIA_NO_ENCONTRADA",
      mensaje: "La categoría no existe o está inactiva.",
    };
  }

  const evaluador = await prisma.usuarios.findUnique({
    where: { id: evaluadorId },
  });

  if (!evaluador || evaluador.rol !== "EVALUADOR") {
    throw {
      codigo: "EVALUADOR_NO_VALIDO",
      mensaje: "El usuario no existe o no es evaluador.",
    };
  }

  if (!evaluador.estado) {
    throw {
      codigo: "EVALUADOR_INACTIVO",
      mensaje: "El evaluador está inactivo.",
    };
  }

  const asignacionesCategoriaActivas = await prisma.asignaciones.findMany({
    where: {
      categoria_id: categoriaId,
      estado: true,
    },
  });

  if (asignacionesCategoriaActivas.length >= 5) {
    throw {
      codigo: "LIMITE_EVALUADORES_CATEGORIA",
      mensaje:
        "La categoría ya tiene el máximo de 5 evaluadores asignados.",
    };
  }

  const asignacionesUsuarioActivas = await prisma.asignaciones.count({
    where: {
      usuario_id: evaluadorId,
      estado: true,
    },
  });

  if (asignacionesUsuarioActivas >= 5) {
    throw {
      codigo: "LIMITE_EVALUACIONES_USUARIO",
      mensaje:
        "El evaluador ya tiene 5 asignaciones activas y no puede recibir más.",
    };
  }

  const existente = await prisma.asignaciones.findUnique({
    where: {
      usuario_id_categoria_id: {
        usuario_id: evaluadorId,
        categoria_id: categoriaId,
      },
    },
  });

  let asignacion;
  let reactivada = false;

  if (existente) {
    if (existente.estado) {
      throw {
        codigo: "EVALUADOR_YA_ASIGNADO",
        mensaje: "El evaluador ya está asignado a esta categoría.",
      };
    }

    asignacion = await prisma.asignaciones.update({
      where: { id: existente.id },
      data: {
        estado: true,
        indice_inicio: null,
        indice_fin: null,
      },
    });
    reactivada = true;
  } else {
    asignacion = await prisma.asignaciones.create({
      data: {
        usuario_id: evaluadorId,
        categoria_id: categoriaId,
      },
    });
  }

  await redistribuirParticipaciones(categoriaId);

  await prisma.logs.create({
    data: {
      entidad: "asignacion",
      entidad_id: asignacion.id,
      campo: reactivada ? "reactivar" : "crear",
      valor_anterior: reactivada ? "false" : null,
      valor_nuevo: JSON.stringify({
        categoria_id: categoriaId,
        usuario_id: evaluadorId,
      }),
      usuario_id: usuarioAuthId,
      motivo: reactivada
        ? "Reactivación de asignación de evaluador a categoría"
        : "Asignación de evaluador a categoría",
    },
  });

  return { asignacion, reactivada };
}

// ===============================
// Eliminar (desactivar) asignación
// ===============================

export async function eliminarAsignacionEvaluadorSrv(
  categoriaId: number,
  evaluadorId: number,
  usuarioAuthId: number
) {
  const asignacion = await prisma.asignaciones.findUnique({
    where: {
      usuario_id_categoria_id: {
        usuario_id: evaluadorId,
        categoria_id: categoriaId,
      },
    },
  });

  if (!asignacion || !asignacion.estado) {
    throw {
      codigo: "ASIGNACION_NO_ENCONTRADA",
      mensaje:
        "La asignación del evaluador a la categoría no existe o ya está inactiva.",
    };
  }

  const asignacionActualizada = await prisma.asignaciones.update({
    where: { id: asignacion.id },
    data: {
      estado: false,
      indice_inicio: null,
      indice_fin: null,
    },
  });

  await redistribuirParticipaciones(categoriaId);

  await prisma.logs.create({
    data: {
      entidad: "asignacion",
      entidad_id: asignacion.id,
      campo: "estado",
      valor_anterior: "true",
      valor_nuevo: "false",
      usuario_id: usuarioAuthId,
      motivo: "Desactivación de asignación de evaluador a categoría",
    },
  });

  return { asignacion: asignacionActualizada };
}
