import prisma from "../config/database";
import {
  ModalidadCategoria,
  TipoFase,
  RolEquipo,
  Rol,
  EstadoFase,
} from "@prisma/client";
import { enviarCorreoGenerico } from "../utils/mailer";

type TipoMedalla = "ORO" | "PLATA" | "BRONCE" | "MENCION";

/**
 * ====== DTOs internos (detalle) ======
 */

export interface GanadorIntegranteDTO {
  ci: string;
  nombre_completo: string;
  unidad_educativa: string;
  correo: string;
}

export interface GanadorCertificadoDTO {
  tipo_medalla: TipoMedalla;
  nota: number;
  modalidad: ModalidadCategoria;
  ci?: string | null;
  nombre_completo?: string | null;
  unidad_educativa?: string | null;
  correo?: string | null;
  equipo_id?: number | null;
  nombre_equipo?: string | null;
  integrantes?: GanadorIntegranteDTO[];
}

export interface ResponsableDTO {
  id: number;
  nombre_completo: string;
  correo: string;
}

export interface FaseFinalDTO {
  id: number;
  estado: EstadoFase;
  correos_enviados: boolean;
  resultados_publicados: boolean;
}

export interface CategoriaGanadoresDTO {
  id: number;
  gestion: number;
  modalidad: ModalidadCategoria;
  area_id: number;
  nivel_id: number;
  nombre_area: string;
  nombre_nivel: string;
}

export interface TotalesPorMedallaDTO {
  oro: number;
  plata: number;
  bronce: number;
  mencion: number;
}

export interface GanadoresCertificadoResponseDTO {
  categoria: CategoriaGanadoresDTO;
  responsable: ResponsableDTO | null;
  fase_final: FaseFinalDTO;
  total_ganadores: number;
  totales_por_medalla: TotalesPorMedallaDTO;
  ganadores: GanadorCertificadoDTO[];
}

/**
 * ====== DTOs planos para el FRONT ======
 */

export interface GanadorPlanoIndividual {
  tipo_medalla: TipoMedalla;
  nota: number;
  ci: string;
  nombre_completo: string;
  unidad_educativa: string;
}

export interface GanadorPlanoGrupalIntegrante {
  ci: string;
  nombre_completo: string;
  unidad_educativa: string;
}

export interface GanadorPlanoGrupal {
  tipo_medalla: TipoMedalla;
  nota: number;
  nombre_equipo: string;
  unidad_educativa: string;
  integrantes: GanadorPlanoGrupalIntegrante[];
}

export type GanadorPlano = GanadorPlanoIndividual | GanadorPlanoGrupal;

export interface GanadoresCertificadoPlanoResponseDTO {
  total: number;
  gestion: number;
  modalidad: ModalidadCategoria;
  responsable_nombre_completo: string | null;
  correos_enviados: boolean;
  resultados_publicados: boolean;
  totales_por_medalla: TotalesPorMedallaDTO;
  ganadores: GanadorPlano[];
}

export interface ResultadoEnvioCorreosDTO {
  categoria: CategoriaGanadoresDTO;
  fase_final: FaseFinalDTO;
  total_destinatarios: number;
  enviados: number;
  fallidos: number;
}

/**
 * ====== Helpers ======
 */

function nombreCompletoPersona(
  nombre: string,
  primer_apellido: string,
  segundo_apellido?: string | null
): string {
  const partes = [nombre, primer_apellido];
  if (segundo_apellido && segundo_apellido.trim() !== "") {
    partes.push(segundo_apellido.trim());
  }
  return partes.join(" ");
}

function asignarMedallasSegunConfiguracion(
  registrosOrdenados: {
    participacionId: number;
    nota: number;
  }[],
  oros: number,
  platas: number,
  bronces: number,
  menciones: number
): { participacionId: number; nota: number; medalla: TipoMedalla }[] {
  const resultado: {
    participacionId: number;
    nota: number;
    medalla: TipoMedalla;
  }[] = [];
  const total = registrosOrdenados.length;
  let indice = 0;

  for (let i = 0; i < oros && indice < total; i++) {
    const r = registrosOrdenados[indice];
    resultado.push({
      participacionId: r.participacionId,
      nota: r.nota,
      medalla: "ORO",
    });
    indice++;
  }

  for (let i = 0; i < platas && indice < total; i++) {
    const r = registrosOrdenados[indice];
    resultado.push({
      participacionId: r.participacionId,
      nota: r.nota,
      medalla: "PLATA",
    });
    indice++;
  }

  for (let i = 0; i < bronces && indice < total; i++) {
    const r = registrosOrdenados[indice];
    resultado.push({
      participacionId: r.participacionId,
      nota: r.nota,
      medalla: "BRONCE",
    });
    indice++;
  }

  for (let i = 0; i < menciones && indice < total; i++) {
    const r = registrosOrdenados[indice];
    resultado.push({
      participacionId: r.participacionId,
      nota: r.nota,
      medalla: "MENCION",
    });
    indice++;
  }

  return resultado;
}

/**
 * 🔹 FUNCIÓN INTERNA: construye el detalle completo (con correos, etc.)
 *    Esta se usa tanto para el JSON plano como para enviar correos.
 */
async function construirGanadoresCertificadoDetalle(
  areaNombre: string,
  nivelNombre: string
): Promise<GanadoresCertificadoResponseDTO> {
  const gestion = new Date().getFullYear();

  const area = await prisma.areas.findFirst({
    where: {
      nombre: areaNombre.trim(),
      estado: true,
    },
  });

  if (!area) {
    throw new Error("No se encontró un área activa con el nombre indicado.");
  }

  const nivel = await prisma.niveles.findFirst({
    where: {
      nombre: nivelNombre.trim(),
      estado: true,
    },
  });

  if (!nivel) {
    throw new Error("No se encontró un nivel activo con el nombre indicado.");
  }

  const categorias = await prisma.categorias.findMany({
    where: {
      gestion,
      area_id: area.id,
      nivel_id: nivel.id,
      estado: true,
      area: { estado: true },
      nivel: { estado: true },
    },
    include: {
      area: true,
      nivel: true,
    },
  });

  if (categorias.length === 0) {
    throw new Error(
      "No se encontró una categoría activa para la gestión, área y nivel indicados."
    );
  }

  if (categorias.length > 1) {
    throw new Error(
      "Existe más de una categoría para la gestión, área y nivel indicados. Debe seleccionar la modalidad."
    );
  }

  const categoria = categorias[0];

  const faseFinal = await prisma.fases.findFirst({
    where: {
      gestion: categoria.gestion,
      tipo: TipoFase.FINAL,
    },
  });

  if (!faseFinal) {
    throw new Error("No se encontró la fase final para la gestión indicada.");
  }

  const participaciones = await prisma.participacion.findMany({
    where: {
      categoria_id: categoria.id,
    },
    include: {
      categoria: {
        include: {
          area: true,
          nivel: true,
        },
      },
      olimpista: true,
      equipo: {
        include: {
          miembros: {
            include: {
              olimpista: true,
            },
          },
        },
      },
      evaluaciones: {
        where: {
          fase_id: faseFinal.id,
        },
      },
    },
  });

  const registrosConNota: {
    participacionId: number;
    nota: number;
  }[] = [];

  const mapaParticipacion = new Map<
    number,
    (typeof participaciones)[number]
  >();

  for (const p of participaciones) {
    mapaParticipacion.set(p.id, p);

    if (p.evaluaciones.length === 0) {
      continue;
    }

    if (categoria.modalidad === ModalidadCategoria.INDIVIDUAL) {
      if (!p.olimpista || !p.olimpista.estado) {
        continue;
      }
    } else if (categoria.modalidad === ModalidadCategoria.GRUPAL) {
      if (!p.equipo) {
        continue;
      }
      const miembrosActivos = p.equipo.miembros.filter(
        (m) => m.olimpista && m.olimpista.estado
      );
      if (miembrosActivos.length === 0) {
        continue;
      }
    }

    const suma = p.evaluaciones.reduce(
      (acc, ev) => acc + Number(ev.nota),
      0
    );
    const promedio = Number((suma / p.evaluaciones.length).toFixed(2));
    registrosConNota.push({
      participacionId: p.id,
      nota: promedio,
    });
  }

  registrosConNota.sort((a, b) => b.nota - a.nota);

  const medallados = asignarMedallasSegunConfiguracion(
    registrosConNota,
    categoria.oros_final,
    categoria.platas_final,
    categoria.bronces_final,
    categoria.menciones_final
  );

  const totalesPorMedalla: TotalesPorMedallaDTO = {
    oro: 0,
    plata: 0,
    bronce: 0,
    mencion: 0,
  };

  const ganadores: GanadorCertificadoDTO[] = [];

  for (const m of medallados) {
    const p = mapaParticipacion.get(m.participacionId);
    if (!p) continue;

    if (categoria.modalidad === ModalidadCategoria.INDIVIDUAL) {
      if (!p.olimpista || !p.olimpista.estado) {
        continue;
      }

      const persona = p.olimpista;
      const ganador: GanadorCertificadoDTO = {
        tipo_medalla: m.medalla,
        nota: m.nota,
        modalidad: categoria.modalidad,
        ci: persona.numero_documento,
        nombre_completo: nombreCompletoPersona(
          persona.nombre,
          persona.primer_apellido,
          persona.segundo_apellido
        ),
        unidad_educativa: persona.unidad_educativa,
        correo: persona.correo,
        equipo_id: null,
        nombre_equipo: null,
      };
      ganadores.push(ganador);
    } else if (categoria.modalidad === ModalidadCategoria.GRUPAL) {
      if (!p.equipo) continue;

      const miembrosActivos = p.equipo.miembros.filter(
        (mbr) => mbr.olimpista && mbr.olimpista.estado
      );
      if (miembrosActivos.length === 0) continue;

      const lider =
        miembrosActivos.find(
          (mbr) => mbr.rol_en_equipo === RolEquipo.LIDER
        ) || miembrosActivos[0];

      const olimpistaLider = lider.olimpista!;
      const integrantes: GanadorIntegranteDTO[] = miembrosActivos.map(
        (mbr) => {
          const o = mbr.olimpista!;
          return {
            ci: o.numero_documento,
            nombre_completo: nombreCompletoPersona(
              o.nombre,
              o.primer_apellido,
              o.segundo_apellido
            ),
            unidad_educativa: o.unidad_educativa,
            correo: o.correo,
          };
        }
      );

      const ganador: GanadorCertificadoDTO = {
        tipo_medalla: m.medalla,
        nota: m.nota,
        modalidad: categoria.modalidad,
        ci: olimpistaLider.numero_documento,
        nombre_completo: nombreCompletoPersona(
          olimpistaLider.nombre,
          olimpistaLider.primer_apellido,
          olimpistaLider.segundo_apellido
        ),
        unidad_educativa: olimpistaLider.unidad_educativa,
        correo: olimpistaLider.correo,
        equipo_id: p.equipo.id,
        nombre_equipo: p.equipo.nombre,
        integrantes,
      };
      ganadores.push(ganador);
    }
  }

  for (const g of ganadores) {
    if (g.tipo_medalla === "ORO") totalesPorMedalla.oro += 1;
    else if (g.tipo_medalla === "PLATA") totalesPorMedalla.plata += 1;
    else if (g.tipo_medalla === "BRONCE") totalesPorMedalla.bronce += 1;
    else if (g.tipo_medalla === "MENCION") totalesPorMedalla.mencion += 1;
  }

  const asignacionResponsable = await prisma.asignaciones.findFirst({
    where: {
      categoria_id: categoria.id,
      estado: true,
      usuario: {
        estado: true,
        rol: Rol.RESPONSABLE,
      },
    },
    include: {
      usuario: true,
    },
  });

  let responsable: ResponsableDTO | null = null;

  if (asignacionResponsable && asignacionResponsable.usuario) {
    const u = asignacionResponsable.usuario;
    responsable = {
      id: u.id,
      nombre_completo: nombreCompletoPersona(
        u.nombre,
        u.primer_apellido,
        u.segundo_apellido
      ),
      correo: u.correo,
    };
  }

  const categoriaDTO: CategoriaGanadoresDTO = {
    id: categoria.id,
    gestion: categoria.gestion,
    modalidad: categoria.modalidad,
    area_id: categoria.area_id,
    nivel_id: categoria.nivel_id,
    nombre_area: categoria.area.nombre,
    nombre_nivel: categoria.nivel.nombre,
  };

  const faseFinalDTO: FaseFinalDTO = {
    id: faseFinal.id,
    estado: faseFinal.estado,
    correos_enviados: faseFinal.correos_enviados,
    resultados_publicados: faseFinal.resultados_publicados,
  };

  const respuesta: GanadoresCertificadoResponseDTO = {
    categoria: categoriaDTO,
    responsable,
    fase_final: faseFinalDTO,
    total_ganadores: ganadores.length,
    totales_por_medalla: totalesPorMedalla,
    ganadores,
  };

  return respuesta;
}

/**
 * 🔹 FUNCIÓN EXPORTADA AL FRONT:
 *     devuelve JSON PLANO sin correos ni datos extra.
 */
export async function obtenerGanadoresCertificado(
  areaNombre: string,
  nivelNombre: string
): Promise<GanadoresCertificadoPlanoResponseDTO> {
  const datos = await construirGanadoresCertificadoDetalle(
    areaNombre,
    nivelNombre
  );

  const ganadoresPlano: GanadorPlano[] = datos.ganadores.map((g) => {
    if (datos.categoria.modalidad === ModalidadCategoria.INDIVIDUAL) {
      const individual: GanadorPlanoIndividual = {
        tipo_medalla: g.tipo_medalla,
        nota: g.nota,
        ci: g.ci || "",
        nombre_completo: g.nombre_completo || "",
        unidad_educativa: g.unidad_educativa || "",
      };
      return individual;
    } else {
      const grupal: GanadorPlanoGrupal = {
        tipo_medalla: g.tipo_medalla,
        nota: g.nota,
        nombre_equipo: g.nombre_equipo || "",
        unidad_educativa: g.unidad_educativa || "",
        integrantes: (g.integrantes || []).map((i) => ({
          ci: i.ci,
          nombre_completo: i.nombre_completo,
          unidad_educativa: i.unidad_educativa,
        })),
      };
      return grupal;
    }
  });

  const plano: GanadoresCertificadoPlanoResponseDTO = {
    total: datos.total_ganadores,
    gestion: datos.categoria.gestion,
    modalidad: datos.categoria.modalidad,
    responsable_nombre_completo: datos.responsable
      ? datos.responsable.nombre_completo
      : null,
    correos_enviados: datos.fase_final.correos_enviados,
    resultados_publicados: datos.fase_final.resultados_publicados,
    totales_por_medalla: datos.totales_por_medalla,
    ganadores: ganadoresPlano,
  };

  return plano;
}

/**
 * 🔹 Envío de correos – se apoya en el DETALLE interno (con correos)
 *     Nada de esto se expone al front.
 */
export async function enviarCorreosGanadoresCertificado(
  areaNombre: string,
  nivelNombre: string,
  usuarioId: number
): Promise<ResultadoEnvioCorreosDTO> {
  const datos = await construirGanadoresCertificadoDetalle(
    areaNombre,
    nivelNombre
  );

  if (datos.ganadores.length === 0) {
    throw new Error(
      "No hay ganadores registrados para los parámetros indicados."
    );
  }

  const destinatarios: {
    nombre: string;
    correo: string;
    medalla: TipoMedalla;
    nota: number;
  }[] = [];

  for (const g of datos.ganadores) {
    if (g.modalidad === ModalidadCategoria.INDIVIDUAL) {
      if (!g.correo || !g.nombre_completo) continue;
      destinatarios.push({
        nombre: g.nombre_completo,
        correo: g.correo,
        medalla: g.tipo_medalla,
        nota: g.nota,
      });
    } else if (g.modalidad === ModalidadCategoria.GRUPAL) {
      if (g.integrantes && g.integrantes.length > 0) {
        for (const integrante of g.integrantes) {
          if (!integrante.correo || !integrante.nombre_completo) continue;
          destinatarios.push({
            nombre: integrante.nombre_completo,
            correo: integrante.correo,
            medalla: g.tipo_medalla,
            nota: g.nota,
          });
        }
      } else if (g.correo && g.nombre_completo) {
        destinatarios.push({
          nombre: g.nombre_completo,
          correo: g.correo,
          medalla: g.tipo_medalla,
          nota: g.nota,
        });
      }
    }
  }

  let enviados = 0;
  let fallidos = 0;

  for (const d of destinatarios) {
    const asunto = `Felicitaciones por su medalla ${d.medalla}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px">
        <h2 style="margin:0 0 8px">Felicitaciones ${d.nombre}</h2>
        <p>Ha obtenido una medalla <b>${d.medalla}</b> en la Olimpiada.</p>
        <p>Su nota final fue: <b>${d.nota.toFixed(2)}</b>.</p>
        <p>Gracias por su participación.</p>
      </div>
    `;
    try {
      await enviarCorreoGenerico({
        para: d.correo,
        asunto,
        html,
      });
      enviados++;
    } catch {
      fallidos++;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.fases.update({
      where: {
        id: datos.fase_final.id,
      },
      data: {
        correos_enviados: true,
      },
    });

    await tx.logs.create({
      data: {
        entidad: "fase",
        entidad_id: datos.fase_final.id,
        campo: "correos_ganadores",
        valor_anterior: String(datos.fase_final.correos_enviados),
        valor_nuevo: "true",
        usuario_id: usuarioId,
        motivo: `Envio de correos a ganadores de categoría ${datos.categoria.nombre_area} - ${datos.categoria.nombre_nivel} (${datos.categoria.modalidad}) gestión ${datos.categoria.gestion}. Enviados: ${enviados}, fallidos: ${fallidos}.`,
      },
    });
  });

  const faseActualizada = await prisma.fases.findUnique({
    where: {
      id: datos.fase_final.id,
    },
  });

  const faseFinalDTO: FaseFinalDTO = faseActualizada
    ? {
        id: faseActualizada.id,
        estado: faseActualizada.estado,
        correos_enviados: faseActualizada.correos_enviados,
        resultados_publicados: faseActualizada.resultados_publicados,
      }
    : datos.fase_final;

  const resultado: ResultadoEnvioCorreosDTO = {
    categoria: datos.categoria,
    fase_final: faseFinalDTO,
    total_destinatarios: destinatarios.length,
    enviados,
    fallidos,
  };

  return resultado;
}
