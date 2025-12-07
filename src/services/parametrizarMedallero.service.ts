import prisma from "../config/database";

export type ParametrizacionMedalleroDTO = {
  idCategoria: number;
  area: string;
  nivel: string;
  oro: number;
  plata: number;
  bronce: number;
  mencion: number;
  notaMin: number;
};

export type UpdateParametrizacionPayload = {
  oro?: number;
  plata?: number;
  bronce?: number;
  mencion?: number;
  notaMin?: number;
};

export async function listarCategoriasMedallero(): Promise<ParametrizacionMedalleroDTO[]> {
  const categorias = await prisma.categorias.findMany({
    where: {
      estado: true,
    },
    include: {
      area: true,
      nivel: true,
    },
    orderBy: [
      { area: { nombre: "asc" } },
      { nivel: { nombre: "asc" } },
    ],
  });

  return categorias.map((c) => ({
    idCategoria: c.id,
    area: c.area.nombre,
    nivel: c.nivel.nombre,
    oro: c.oros_final,
    plata: c.platas_final,
    bronce: c.bronces_final,
    mencion: c.menciones_final,
    notaMin: c.nota_min_clasificacion,
  }));
}

export async function actualizarParametrizacionMedallero(
  idCategoria: number,
  payload: UpdateParametrizacionPayload,
  idUsuario: number
): Promise<ParametrizacionMedalleroDTO> {
  const categoria = await prisma.categorias.findUnique({
    where: { id: idCategoria },
    include: {
      area: true,
      nivel: true,
    },
  });

  if (!categoria) {
    const err: any = new Error("La categoría no existe.");
    err.code = "NO_CATEGORIA";
    throw err;
  }

  const camposActualizables: (keyof UpdateParametrizacionPayload)[] = [
    "oro",
    "plata",
    "bronce",
    "mencion",
    "notaMin",
  ];

  const dataUpdate: Record<string, number> = {};
  const logsCambios: {
    campo: string;
    valorAnterior: string;
    valorNuevo: string;
  }[] = [];

  for (const campo of camposActualizables) {
    const nuevoValor = payload[campo];

    if (nuevoValor === undefined || nuevoValor === null) continue;

    let nombreColumnaPrisma: string;
    let valorAnterior: number;

    switch (campo) {
      case "oro":
        nombreColumnaPrisma = "oros_final";
        valorAnterior = categoria.oros_final;
        break;
      case "plata":
        nombreColumnaPrisma = "platas_final";
        valorAnterior = categoria.platas_final;
        break;
      case "bronce":
        nombreColumnaPrisma = "bronces_final";
        valorAnterior = categoria.bronces_final;
        break;
      case "mencion":
        nombreColumnaPrisma = "menciones_final";
        valorAnterior = categoria.menciones_final;
        break;
      case "notaMin":
        nombreColumnaPrisma = "nota_min_clasificacion";
        valorAnterior = categoria.nota_min_clasificacion;
        break;
    }

    if (valorAnterior === nuevoValor) continue;

    dataUpdate[nombreColumnaPrisma] = nuevoValor;

    logsCambios.push({
      campo: nombreColumnaPrisma,
      valorAnterior: String(valorAnterior),
      valorNuevo: String(nuevoValor),
    });
  }

  if (!Object.keys(dataUpdate).length) {
    const err: any = new Error("No hay cambios para guardar.");
    err.code = "SIN_CAMBIOS";
    throw err;
  }

  const [categoriaActualizada] = await prisma.$transaction([
    prisma.categorias.update({
      where: { id: idCategoria },
      data: dataUpdate,
      include: {
        area: true,
        nivel: true,
      },
    }),
    prisma.logs.createMany({
      data: logsCambios.map((c) => ({
        entidad: "categorias_medallero",
        entidad_id: idCategoria,
        campo: c.campo,
        valor_anterior: c.valorAnterior,
        valor_nuevo: c.valorNuevo,
        usuario_id: idUsuario,
        motivo: "Actualización de parametrización de medallas desde panel de administración",
      })),
    }),
  ]);

  return {
    idCategoria: categoriaActualizada.id,
    area: categoriaActualizada.area.nombre,
    nivel: categoriaActualizada.nivel.nombre,
    oro: categoriaActualizada.oros_final,
    plata: categoriaActualizada.platas_final,
    bronce: categoriaActualizada.bronces_final,
    mencion: categoriaActualizada.menciones_final,
    notaMin: categoriaActualizada.nota_min_clasificacion,
  };
}
