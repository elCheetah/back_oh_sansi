import {
  PrismaClient,
  Prisma,
  TipoParticipacion,
} from "@prisma/client";
import { InscritoDTO } from "../types/inscritos.types";

const prisma = new PrismaClient();

type ListFiltros = {
  search?: string;
  area?: string;
  nivel?: string;
  estado?: "CLASIFICADO" | "NO_CLASIFICADO" | "DESCALIFICADO";
  tipo?: "INDIVIDUAL" | "EQUIPO"; // INDIVIDUAL o EQUIPO
  page?: number;
  pageSize?: number;
};

export async function listarInscritosSrv(f: ListFiltros) {
  const page = Math.max(1, Number(f.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(f.pageSize ?? 20)));

  const where: Prisma.ParticipacionWhereInput = {
    ...(f.estado && { estado: f.estado }),

    // 🔹 Filtro por tipo: INDIVIDUAL o EQUIPO
    ...(f.tipo === "INDIVIDUAL" && {
      tipo: TipoParticipacion.INDIVIDUAL,
      olimpista_id: { not: null },
    }),
    ...(f.tipo === "EQUIPO" && {
      tipo: TipoParticipacion.EQUIPO,
      equipo_id: { not: null },
    }),

    ...(f.area && {
      area: { nombre: { equals: f.area, mode: "insensitive" } },
    }),
    ...(f.nivel && {
      nivel: { nombre: { equals: f.nivel, mode: "insensitive" } },
    }),

    OR: f.search
      ? [
          {
            olimpista: {
              OR: [
                { nombre: { contains: f.search, mode: "insensitive" } },
                { ap_paterno: { contains: f.search, mode: "insensitive" } },
                { ap_materno: { contains: f.search, mode: "insensitive" } },
                { numero_documento: { contains: f.search } },
              ],
            },
          },
          {
            equipo: {
              nombre: { contains: f.search, mode: "insensitive" },
            },
          },
        ]
      : undefined,
  };

  const [total, rows] = await prisma.$transaction([
    prisma.participacion.count({ where }),
    prisma.participacion.findMany({
      where,
      include: {
        area: { select: { id: true, nombre: true } },
        nivel: { select: { id: true, nombre: true } },
        olimpista: {
          select: {
            id: true,
            nombre: true,
            ap_paterno: true,
            ap_materno: true,
            numero_documento: true,
            unidad_educativa: true,
            departamento: true,
            tutor: {
              select: {
                id: true,
                nombre: true,
                ap_paterno: true,
                ap_materno: true,
              },
            },
          },
        },
        equipo: {
          select: {
            id: true,
            nombre: true,
            miembros: {
              take: 1,
              include: {
                olimpista: {
                  select: {
                    unidad_educativa: true,
                    departamento: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const data = rows.map<InscritoDTO>((p): InscritoDTO => {
    const tutor = p.olimpista?.tutor ?? null;
    const primerMiembro = p.equipo?.miembros[0]?.olimpista;

    return {
      idParticipacion: p.id,
      modalidad: p.tipo,
      estado: p.estado,
      area: p.area,
      nivel: p.nivel,
      olimpista: p.olimpista
        ? {
            id: p.olimpista.id,
            nombreCompleto: [
              p.olimpista.nombre,
              p.olimpista.ap_paterno,
              p.olimpista.ap_materno ?? "",
            ]
              .join(" ")
              .trim(),
            ci: p.olimpista.numero_documento,
            unidadEducativa: p.olimpista.unidad_educativa,
            departamento: p.olimpista.departamento,
          }
        : undefined,
      tutorLegal: tutor
        ? {
            id: tutor.id,
            nombreCompleto: [
              tutor.nombre,
              tutor.ap_paterno,
              tutor.ap_materno ?? "",
            ]
              .join(" ")
              .trim(),
          }
        : null,
      equipo: p.equipo
        ? {
            id: p.equipo.id,
            nombre: p.equipo.nombre,
            unidadEducativa: primerMiembro?.unidad_educativa,
            departamento: primerMiembro?.departamento,
          }
        : null,
    };
  });

  return { total, page, pageSize, data };
}
