import {
  PrismaClient,
  ModalidadCategoria,
  RolEquipo,
} from "@prisma/client";

const prisma = new PrismaClient();

export type IntegranteGrupoDTO = {
  idOlimpista: number;
  ci: string;
  nombreCompleto: string;
  rol: RolEquipo;
};

export type InscritoGrupalDTO = {
  idParticipacion: number;
  idGrupo: number;
  nombreGrupo: string;
  unidadEducativa: string | null;
  departamento: string | null;
  area: string;
  nivel: string;
  integrantes: IntegranteGrupoDTO[];
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

export const InscritosGrupalesService = {
  async listar(): Promise<InscritoGrupalDTO[]> {
    const participaciones = await prisma.participacion.findMany({
      where: {
        equipo_id: { not: null },
        categoria: {
          modalidad: ModalidadCategoria.GRUPAL,
          estado: true,
          area: { estado: true },
          nivel: { estado: true },
        },
      },
      include: {
        categoria: {
          include: {
            area: true,
            nivel: true,
          },
        },
        equipo: {
          include: {
            miembros: {
              include: {
                olimpista: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    const resultado: InscritoGrupalDTO[] = [];

    for (const p of participaciones) {
      if (!p.equipo) continue;

      const miembrosActivos = p.equipo.miembros.filter(
        (m) => m.olimpista && m.olimpista.estado
      );

      const lider =
        miembrosActivos.find((m) => m.rol_en_equipo === RolEquipo.LIDER) ??
        miembrosActivos[0] ??
        null;

      const unidadEducativa =
        lider?.olimpista?.unidad_educativa ?? null;
      const departamento = lider?.olimpista?.departamento ?? null;

      const integrantes: IntegranteGrupoDTO[] = miembrosActivos.map((m) => {
        const o = m.olimpista!;
        return {
          idOlimpista: o.id,
          ci: o.numero_documento,
          nombreCompleto: nombreCompleto(
            o.nombre,
            o.primer_apellido,
            o.segundo_apellido
          ),
          rol: m.rol_en_equipo,
        };
      });

      resultado.push({
        idParticipacion: p.id,
        idGrupo: p.equipo.id,
        nombreGrupo: p.equipo.nombre,
        unidadEducativa,
        departamento,
        area: p.categoria.area.nombre,
        nivel: p.categoria.nivel.nombre,
        integrantes,
      });
    }

    return resultado;
  },

  // Elimina participaciones del grupo y el equipo (con sus miembros)
  async bajaParticipacionGrupo(grupoId: number) {
    // Primero obtenemos las participaciones del grupo (por si quieres saber cuántas borró)
    const participaciones = await prisma.participacion.findMany({
      where: {
        equipo_id: grupoId,
        categoria: {
          modalidad: ModalidadCategoria.GRUPAL,
        },
      },
      select: { id: true },
    });

    const idsParticipaciones = participaciones.map((p) => p.id);

    const [deletedEvals, deletedParticipaciones, deletedMiembros, deletedEquipos] =
      await prisma.$transaction([
        // (opcional) limpiar evaluaciones explícitamente
        prisma.evaluaciones.deleteMany({
          where: {
            participacion_id: { in: idsParticipaciones },
          },
        }),
        prisma.participacion.deleteMany({
          where: {
            id: { in: idsParticipaciones },
          },
        }),
        prisma.miembrosEquipo.deleteMany({
          where: {
            equipo_id: grupoId,
          },
        }),
        prisma.equipos.deleteMany({
          where: { id: grupoId },
        }),
      ]);

    return {
      updated: deletedParticipaciones.count, 
      deletedEvaluaciones: deletedEvals.count,
      deletedParticipaciones: deletedParticipaciones.count,
      deletedMiembros: deletedMiembros.count,
      deletedEquipos: deletedEquipos.count,
    };
  },

  async removerIntegranteDeGrupo(grupoId: number, olimpistaId: number) {
    const result = await prisma.miembrosEquipo.deleteMany({
      where: {
        equipo_id: grupoId,
        olimpista_id: olimpistaId,
      },
    });

    return {
      removed: result.count,
    };
  },
};
