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
  return `${u.nombre} ${u.primer_apellido}${u.segundo_apellido ? " " + u.segundo_apellido : ""
    }`.trim();
}

function etiquetaParticipacion(
  p: any,
  modalidad: "INDIVIDUAL" | "GRUPAL"
): string | null {
  // INDIVIDUAL → usamos apellido del olimpista
  if (modalidad === "INDIVIDUAL") {
    return p.olimpista?.primer_apellido ?? null;
  }

  // GRUPAL → usamos nombre del equipo
  if (modalidad === "GRUPAL") {
    return p.equipo?.nombre ?? null;
  }

  return null;
}


// ===============================
// Redistribuir indices participaciones
// ===============================

async function redistribuirParticipaciones(categoriaId: number): Promise<void> {
  // 1) Obtener la categoría para saber la modalidad
  const categoria = await prisma.categorias.findUnique({
    where: { id: categoriaId },
    select: { modalidad: true },
  });

  if (!categoria) {
    // Categoría eliminada o inexistente, nada que hacer
    return;
  }

  // 2) Participaciones válidas según modalidad
  const participaciones = await prisma.participacion.findMany({
    where: {
      categoria_id: categoriaId,
      ...(categoria.modalidad === "INDIVIDUAL"
        ? { olimpista_id: { not: null } } // solo individuales
        : { equipo_id: { not: null } }), // solo grupales
    },
    orderBy: { id: "asc" },
  });

  const total = participaciones.length;

  // 3) Solo evaluadores (rol EVALUADOR) entran en la redistribución
  const asignacionesEvaluadores = await prisma.asignaciones.findMany({
    where: {
      categoria_id: categoriaId,
      estado: true,
      usuario: {
        rol: "EVALUADOR",
      },
    },
    orderBy: { id: "asc" },
  });

  // Si no hay participaciones o no hay evaluadores activos:
  if (!asignacionesEvaluadores.length || !total) {
    // Limpiamos índices de TODAS las asignaciones de la categoría
    await prisma.asignaciones.updateMany({
      where: { categoria_id: categoriaId },
      data: { indice_inicio: null, indice_fin: null },
    });
    return;
  }

  // 4) Repartir las participaciones solo entre evaluadores
  const evaluadoresCount = asignacionesEvaluadores.length;
  const base = Math.floor(total / evaluadoresCount);
  const resto = total % evaluadoresCount;

  let indiceActual = 1;

  for (let i = 0; i < asignacionesEvaluadores.length; i++) {
    const asignacion = asignacionesEvaluadores[i];

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

  // 5) Asegurar que RESPONSABLES (u otros roles) queden siempre en null
  await prisma.asignaciones.updateMany({
    where: {
      categoria_id: categoriaId,
      usuario: {
        rol: { not: "EVALUADOR" },
      },
    },
    data: {
      indice_inicio: null,
      indice_fin: null,
    },
  });
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

    const evaluadores: EvaluadorAsignadoDTO[] = cat.asignaciones
      // 🔹 Solo usuarios con rol EVALUADOR
      .filter((asig: any) => asig.usuario?.rol === "EVALUADOR")
      .map((asig: any) => {
        let apellidoInicio: string | null = null;
        let apellidoFin: string | null = null;

        if (
          asig.indice_inicio &&
          asig.indice_inicio >= 1 &&
          asig.indice_inicio <= totalPart
        ) {
          const pIni = cat.participaciones[asig.indice_inicio - 1];
          apellidoInicio = pIni
            ? etiquetaParticipacion(pIni, cat.modalidad)
            : null;
        }

        if (
          asig.indice_fin &&
          asig.indice_fin >= 1 &&
          asig.indice_fin <= totalPart
        ) {
          const pFin = cat.participaciones[asig.indice_fin - 1];
          apellidoFin = pFin
            ? etiquetaParticipacion(pFin, cat.modalidad)
            : null;
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
      });

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

  // Todos los usuarios que tienen alguna asignación (activa o no) en ESTA categoría
  const asignacionesCategoria = await prisma.asignaciones.findMany({
    where: {
      categoria_id: categoriaId,
      // sin filtro de estado: cuenta activas e inactivas
    },
    select: {
      usuario_id: true,
    },
  });

  const idsAsignadosCategoria = new Set(
    asignacionesCategoria.map((a) => a.usuario_id)
  );

  // Candidatos: EVALUADOR o RESPONSABLE, activos
  const candidatos = await prisma.usuarios.findMany({
    where: {
      estado: true,
      rol: { in: ["EVALUADOR", "RESPONSABLE"] }, // nunca ADMINISTRADOR
    },
    include: {
      // TODAS las asignaciones (para saber si el responsable tiene alguna
      // y para contar las activas del evaluador)
      asignaciones: true,
    },
    orderBy: [{ nombre: "asc" }, { primer_apellido: "asc" }],
  });

  const filtrados = candidatos.filter((u) => {
    const totalAsignaciones = u.asignaciones.length;
    const asignacionesActivas = u.asignaciones.filter((a) => a.estado).length;

    // 1) Reglas para EVALUADOR
    if (u.rol === "EVALUADOR") {
      // límite global de 5 asignaciones activas
      if (asignacionesActivas >= 5) return false;

      // si ya tiene asignación (activa o no) en esta categoría → no mostrar
      if (idsAsignadosCategoria.has(u.id)) return false;
    }

    // 2) Reglas para RESPONSABLE
    if (u.rol === "RESPONSABLE") {
      // si ya tiene CUALQUIER registro en asignaciones (activo o no) → no mostrar
      if (totalAsignaciones > 0) return false;
      // implícitamente, si tuviera algo en esta categoría también queda fuera
    }

    // 3) Filtro de búsqueda (nombre completo o CI)
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

  // Ahora permitimos EVALUADOR o RESPONSABLE
  if (
    !evaluador ||
    (evaluador.rol !== "EVALUADOR" && evaluador.rol !== "RESPONSABLE")
  ) {
    throw {
      codigo: "EVALUADOR_NO_VALIDO",
      mensaje: "El usuario no existe o no tiene un rol válido para evaluar.",
    };
  }

  if (!evaluador.estado) {
    throw {
      codigo: "EVALUADOR_INACTIVO",
      mensaje: "El evaluador está inactivo.",
    };
  }

  // Si es RESPONSABLE, lo convertimos a EVALUADOR antes de asignarlo
  let rolCambiado = false;
  if (evaluador.rol === "RESPONSABLE") {
    await prisma.usuarios.update({
      where: { id: evaluador.id },
      data: { rol: "EVALUADOR" },
    });
    rolCambiado = true;

    // Log del cambio de rol (opcional pero útil)
    await prisma.logs.create({
      data: {
        entidad: "usuario",
        entidad_id: evaluador.id,
        campo: "rol",
        valor_anterior: "RESPONSABLE",
        valor_nuevo: "EVALUADOR",
        usuario_id: usuarioAuthId,
        motivo: "Cambio de rol de RESPONSABLE a EVALUADOR para asignación de categoría",
      },
    });
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
        rol_cambiado: rolCambiado ? "RESPONSABLE→EVALUADOR" : undefined,
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

  if (!asignacion) {
    throw {
      codigo: "ASIGNACION_NO_ENCONTRADA",
      mensaje:
        "La asignación del evaluador a la categoría no existe.",
    };
  }

  // Eliminación FÍSICA de la asignación
  const asignacionEliminada = await prisma.asignaciones.delete({
    where: { id: asignacion.id },
  });

  // Redistribuir participaciones entre las asignaciones que queden
  await redistribuirParticipaciones(categoriaId);

  await prisma.logs.create({
    data: {
      entidad: "asignacion",
      entidad_id: asignacion.id,
      campo: "eliminar",
      valor_anterior: JSON.stringify({
        estado: asignacion.estado,
        indice_inicio: asignacion.indice_inicio,
        indice_fin: asignacion.indice_fin,
        usuario_id: asignacion.usuario_id,
        categoria_id: asignacion.categoria_id,
      }),
      valor_nuevo: null,
      usuario_id: usuarioAuthId,
      motivo: "Eliminación de asignación de evaluador a categoría",
    },
  });

  return { asignacion: asignacionEliminada };
}

