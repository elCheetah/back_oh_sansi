// src/services/configMedallas.service.ts
import prisma from "../config/database";

type Modalidad = "INDIVIDUAL" | "GRUPAL";

interface ListarConfigMedallasParams {
  gestion: number;
  search?: string;
  modalidad?: Modalidad;
}

export const listarConfigMedallasSrv = async ({
  gestion,
  search,
  modalidad,
}: ListarConfigMedallasParams) => {
  const where: any = {
    gestion,
    estado: true,
    area: { estado: true },
    nivel: { estado: true },
  };

  if (modalidad) {
    where.modalidad = modalidad;
  }

  if (search && search.length > 0) {
    const term = search.toLowerCase();
    where.OR = [
      { area: { nombre: { contains: term, mode: "insensitive" } } },
      { nivel: { nombre: { contains: term, mode: "insensitive" } } },
    ];
  }

  // 👇 cast a any para que TS no se queje
  const categorias = await (prisma as any).categorias.findMany({
    where,
    include: {
      area: true,
      nivel: true,
    },
    orderBy: [
      { area: { nombre: "asc" } },
      { nivel: { nombre: "asc" } },
    ],
  });

  const items = categorias.map((c: any) => ({
    id: c.id,
    gestion: c.gestion,
    areaId: c.area_id,
    areaNombre: c.area.nombre,
    nivelId: c.nivel_id,
    nivelNombre: c.nivel.nombre,
    modalidad: c.modalidad,
    oro: c.oros_final,
    plata: c.platas_final,
    bronce: c.bronces_final,
    menciones: c.menciones_final,
    notaMinAprobacion: c.nota_min_clasificacion,
  }));

  return {
    total: items.length,
    items,
  };
};

interface ActualizarConfigMedallasInput {
  oros_final: number;
  platas_final: number;
  bronces_final: number;
  menciones_final?: number;
  nota_min_clasificacion: number;
}

export const actualizarConfigMedallasSrv = async (
  categoriaId: number,
  input: ActualizarConfigMedallasInput,
  usuarioId: number | null
) => {
  const categoria = await (prisma as any).categorias.findUnique({
    where: { id: categoriaId },
    include: {
      area: true,
      nivel: true,
    },
  });

  if (!categoria) {
    const error: any = new Error("Categoría no encontrada");
    error.codigo = "CATEGORIA_NO_ENCONTRADA";
    throw error;
  }

  if (!categoria.estado || !categoria.area.estado || !categoria.nivel.estado) {
    const error: any = new Error("Categoría/Área/Nivel inactivos");
    error.codigo = "CATEGORIA_INACTIVA";
    throw error;
  }

  const [categoriaActualizada] = await prisma.$transaction([
    (prisma as any).categorias.update({
      where: { id: categoriaId },
      data: {
        oros_final: input.oros_final,
        platas_final: input.platas_final,
        bronces_final: input.bronces_final,
        menciones_final: input.menciones_final ?? 0,
        nota_min_clasificacion: input.nota_min_clasificacion,
      },
      include: {
        area: true,
        nivel: true,
      },
    }),
    ...(usuarioId
      ? [
          prisma.logs.create({
            data: {
              entidad: "CATEGORIAS",
              entidad_id: categoriaId,
              campo: "CONFIG_MEDALLAS",
              valor_anterior: JSON.stringify({
                oros_final: categoria.oros_final,
                platas_final: categoria.platas_final,
                bronces_final: categoria.bronces_final,
                menciones_final: categoria.menciones_final,
                nota_min_clasificacion: categoria.nota_min_clasificacion,
              }),
              valor_nuevo: JSON.stringify({
                oros_final: input.oros_final,
                platas_final: input.platas_final,
                bronces_final: input.bronces_final,
                menciones_final: input.menciones_final ?? 0,
                nota_min_clasificacion: input.nota_min_clasificacion,
              }),
              usuario_id: usuarioId ?? 0,
              motivo:
                "Actualización de configuración de medallas y nota mínima",
            },
          }),
        ]
      : []),
  ]);

  return {
    id: categoriaActualizada.id,
    gestion: categoriaActualizada.gestion,
    areaId: categoriaActualizada.area_id,
    areaNombre: categoriaActualizada.area.nombre,
    nivelId: categoriaActualizada.nivel_id,
    nivelNombre: categoriaActualizada.nivel.nombre,
    modalidad: categoriaActualizada.modalidad,
    oro: categoriaActualizada.oros_final,
    plata: categoriaActualizada.platas_final,
    bronce: categoriaActualizada.bronces_final,
    menciones: categoriaActualizada.menciones_final,
    notaMinAprobacion: categoriaActualizada.nota_min_clasificacion,
  };
};
