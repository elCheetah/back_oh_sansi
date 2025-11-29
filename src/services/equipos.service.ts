// src/services/equipos.service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type MiembroEquipoDTO = {
  idOlimpista: number;
  nombreCompleto: string;
  unidadEducativa: string;
  departamento: string;
  rolEnEquipo: string;
};

export async function listarMiembrosEquipoSrv(equipoId: number) {
  const equipo = await prisma.equipos.findUnique({
    where: { id: equipoId },
    include: {
      miembros: {
        include: {
          olimpista: true,
        },
      },
    },
  });

  if (!equipo) {
    return { ok: false, message: "EQUIPO_NO_ENCONTRADO" as const };
  }

  const miembros: MiembroEquipoDTO[] = equipo.miembros.map((m) => ({
    idOlimpista: m.olimpista.id,
    nombreCompleto:
      `${m.olimpista.nombre} ${m.olimpista.ap_paterno} ${
        m.olimpista.ap_materno ?? ""
      }`.trim(),
    unidadEducativa: m.olimpista.unidad_educativa,
    departamento: m.olimpista.departamento,
    rolEnEquipo: m.rol_en_equipo, // "LIDER" | "PARTICIPANTE"
  }));

  return {
    ok: true,
    equipo: { id: equipo.id, nombre: equipo.nombre },
    miembros,
  };
}
