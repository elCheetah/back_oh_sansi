import { PrismaClient, Prisma } from "@prisma/client";
import { InscritoDTO } from "../types/inscritos.types";

type ListFiltros = {
  search?: string;
  area?: string;
  nivel?: string;
  estado?: "CLASIFICADO" | "NO_CLASIFICADO" | "DESCALIFICADO";
  tipo?: "INDIVIDUAL" | "EQUIPO";
  page?: number;
  pageSize?: number;
};

export async function listarInscritosSrv(f: ListFiltros) {
  // ✅ Creamos un PrismaClient nuevo por request (aisla el prepared statement)
  const prisma = new PrismaClient();

  try {
    const page = Math.max(1, Number(f.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(f.pageSize ?? 20)));

    // 🎯 Filtros dinámicos
    const where: Prisma.ParticipacionWhereInput = {
      ...(f.estado && { estado: f.estado }),
      ...(f.tipo && { tipo: f.tipo }),
      ...(f.area && { area: { nombre: { equals: f.area, mode: "insensitive" } } }),
      ...(f.nivel && { nivel: { nombre: { equals: f.nivel, mode: "insensitive" } } }),
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
            { equipo: { nombre: { contains: f.search, mode: "insensitive" } } },
          ]
        : undefined,
    };

    // ✅ Conteo manual (sin count)
    const totalRows = await new PrismaClient().participacion.findMany({
      where,
      select: { id: true },
    });
    const total = totalRows.length;

    // ✅ Consulta principal
    const rows = await prisma.participacion.findMany({
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
        equipo: { select: { id: true, nombre: true } },
      },
      orderBy: { id: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // ✅ DTO limpio
    const data = rows.map<InscritoDTO>((p) => ({
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
      tutorLegal: p.olimpista?.tutor
        ? {
            id: p.olimpista.tutor.id,
            nombreCompleto: [
              p.olimpista.tutor.nombre,
              p.olimpista.tutor.ap_paterno,
              p.olimpista.tutor.ap_materno ?? "",
            ]
              .join(" ")
              .trim(),
          }
        : null,
      equipo: p.equipo ? { id: p.equipo.id, nombre: p.equipo.nombre } : null,
    }));

    return { total, page, pageSize, data };
  } catch (error) {
    console.error("❌ Error en listarInscritosSrv:", error);
    throw error;
  } finally {
    // ✅ Cerramos la conexión para evitar prepared statements persistentes
    await prisma.$disconnect();
  }
}

