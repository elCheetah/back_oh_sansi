// src/services/parametrizacionMedallasService.ts
import prisma from "../config/database";

export type FilaParametrizacionMedallasDTO = {
  areaId: number;
  areaNombre: string;
  nivelId: number;
  nivelNombre: string;
  oros: number | null;
  platas: number | null;
  bronces: number | null;
  menciones: number | null;
  notaMinAprobacion: number | null;
};

/**
 * Lista todas las combinaciones área+nivel que tengan participación,
 * y para cada una trae (si existe) su configuración de medallas.
 */
export const listarParametrizacionMedallas = async (): Promise<
  FilaParametrizacionMedallasDTO[]
> => {
  // 1) Combinaciones distintas de área+nivel en Participacion
  const combos = await prisma.participacion.groupBy({
    by: ["area_id", "nivel_id"],
  });

  if (combos.length === 0) return [];

  const areaIds = [...new Set(combos.map((c) => c.area_id))];
  const nivelIds = [...new Set(combos.map((c) => c.nivel_id))];

  // 2) Traer catálogos y configuraciones actuales
  const [areas, niveles, configuraciones] = await Promise.all([
    prisma.areas.findMany({
      where: { id: { in: areaIds }, estado: true },
    }),
    prisma.niveles.findMany({
      where: { id: { in: nivelIds }, estado: true },
    }),
    prisma.configMedallas.findMany({
      where: {
        OR: combos.map((c) => ({
          area_id: c.area_id,
          nivel_id: c.nivel_id,
        })),
      },
    }),
  ]);

  // 3) Armar DTO para el frontend
  const filas: FilaParametrizacionMedallasDTO[] = combos.map((combo) => {
    const area = areas.find((a) => a.id === combo.area_id);
    const nivel = niveles.find((n) => n.id === combo.nivel_id);
    const config = configuraciones.find(
      (cm) => cm.area_id === combo.area_id && cm.nivel_id === combo.nivel_id
    );

    return {
      areaId: combo.area_id,
      areaNombre: area?.nombre ?? "Área desconocida",
      nivelId: combo.nivel_id,
      nivelNombre: nivel?.nombre ?? "Nivel desconocido",
      oros: config?.oros ?? null,
      platas: config?.platas ?? null,
      bronces: config?.bronces ?? null,
      menciones: config?.menciones ?? null,
      notaMinAprobacion: config?.nota_min_aprobacion ?? null,
    };
  });

  // Ordenar por área y luego nivel
  filas.sort((a, b) => {
    if (a.areaNombre === b.areaNombre) {
      return a.nivelNombre.localeCompare(b.nivelNombre);
    }
    return a.areaNombre.localeCompare(b.areaNombre);
  });

  return filas;
};

type GuardarConfigMedallasParams = {
  areaId: number;
  nivelId: number;
  oros: number;
  platas: number;
  bronces: number;
  menciones: number;
  notaMinAprobacion: number;
};

/**
 * Crea o actualiza (upsert) la configuración de medallas para un área+nivel.
 */
export const guardarConfigMedallas = async (
  params: GuardarConfigMedallasParams
) => {
  const {
    areaId,
    nivelId,
    oros,
    platas,
    bronces,
    menciones,
    notaMinAprobacion,
  } = params;

  const config = await prisma.configMedallas.upsert({
    where: {
      // nombre que genera Prisma por el @@unique([area_id, nivel_id])
      area_id_nivel_id: {
        area_id: areaId,
        nivel_id: nivelId,
      },
    },
    create: {
      area_id: areaId,
      nivel_id: nivelId,
      oros,
      platas,
      bronces,
      menciones,
      nota_min_aprobacion: notaMinAprobacion,
    },
    update: {
      oros,
      platas,
      bronces,
      menciones,
      nota_min_aprobacion: notaMinAprobacion,
    },
  });

  return config;
};

/**
 * Elimina completamente la configuración de medallas de un área+nivel.
 * (sirve como "limpiar" en el front)
 */
export const eliminarConfigMedallas = async (
  areaId: number,
  nivelId: number
) => {
  await prisma.configMedallas.delete({
    where: {
      area_id_nivel_id: {
        area_id: areaId,
        nivel_id: nivelId,
      },
    },
  });
};
