// src/services/inscritosIndividuales.service.ts
import { PrismaClient, EstadoParticipacion, ModalidadCategoria } from "@prisma/client";

const prisma = new PrismaClient();

export type InscritoIndividualDTO = {
  idParticipacion: number;
  idOlimpista: number;
  nombreCompleto: string;
  unidadEducativa: string;
  modalidad: ModalidadCategoria;
  departamento: string;
  area: string;
  nivel: string;
  tutorLegal: string | null;
};

function nombreCompleto(
  nombre: string,
  primer_apellido: string,
  segundo_apellido: string | null
): string {
  return [nombre, primer_apellido, segundo_apellido ?? ""]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export const InscritosIndividualesService = {
  async listar(): Promise<InscritoIndividualDTO[]> {
    const participaciones = await prisma.participacion.findMany({
      where: {
        estado: { not: EstadoParticipacion.DESCALIFICADO },
        categoria: {
          modalidad: ModalidadCategoria.INDIVIDUAL,
          estado: true,
          area: { estado: true },
          nivel: { estado: true },
        },
        olimpista: {
          isNot: null,
        },
      },
      include: {
        categoria: {
          include: {
            area: true,
            nivel: true,
          },
        },
        olimpista: {
          include: {
            tutor: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    const filtradas = participaciones.filter(
      (p) => p.olimpista && p.olimpista.estado
    );

    return filtradas.map((p) => {
      const o = p.olimpista!;
      const t = o.tutor;

      return {
        idParticipacion: p.id,
        idOlimpista: o.id,
        nombreCompleto: nombreCompleto(
          o.nombre,
          o.primer_apellido,
          o.segundo_apellido
        ),
        unidadEducativa: o.unidad_educativa,
        modalidad: p.categoria.modalidad,
        departamento: o.departamento,
        area: p.categoria.area.nombre,
        nivel: p.categoria.nivel.nombre,
        tutorLegal: t
          ? nombreCompleto(t.nombre, t.primer_apellido, t.segundo_apellido)
          : null,
      };
    });
  },

  async bajaParticipacionPorOlimpista(olimpistaId: number) {
    const result = await prisma.participacion.updateMany({
      where: {
        olimpista_id: olimpistaId,
        estado: { not: EstadoParticipacion.DESCALIFICADO },
        categoria: {
          modalidad: ModalidadCategoria.INDIVIDUAL,
        },
      },
      data: {
        estado: EstadoParticipacion.DESCALIFICADO,
      },
    });

    return {
      updated: result.count,
    };
  },

  async bajaOlimpista(olimpistaId: number) {
    const olimpista = await prisma.olimpistas.update({
      where: { id: olimpistaId },
      data: { estado: false },
    });

    return {
      id: olimpista.id,
      nombreCompleto: nombreCompleto(
        olimpista.nombre,
        olimpista.primer_apellido,
        olimpista.segundo_apellido
      ),
      estado: olimpista.estado,
    };
  },
};
