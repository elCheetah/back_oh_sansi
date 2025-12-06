import { ResultadoImportacion, WarningFila, ErrorFila } from './../types';
import { MENSAJES } from './../messages/catalogo';

/**
 * Agrupa errores que tengan exactamente el mismo mensaje base
 * (sin importar el número de fila).
 */
function agruparErroresPorMensaje(errores: ErrorFila[]): Array<{ filas: string; mensaje: string }> {
  const mapa = new Map<string, number[]>();

  for (const e of errores) {
    // Limpiamos el texto para que no afecte "fila X"
    const baseMsg = e.mensaje
      .replace(/la fila\s*\d+/gi, '')
      .replace(/No se insertó a la fila\s*\d+/gi, '')
      .trim();

    if (!mapa.has(baseMsg)) {
      mapa.set(baseMsg, [e.fila]);
    } else {
      mapa.get(baseMsg)!.push(e.fila);
    }
  }

  const resultado: Array<{ filas: string; mensaje: string }> = [];
  for (const [mensaje, filas] of mapa.entries()) {
    const filasStr = filas.length > 1 ? filas.join(',') : String(filas[0]);
    resultado.push({ filas: filasStr, mensaje: mensaje.trim() });
  }

  // Ordenar por primera fila
  return resultado.sort((a, b) => {
    const fa = parseInt(a.filas.split(',')[0]);
    const fb = parseInt(b.filas.split(',')[0]);
    return fa - fb;
  });
}

/**
 * Une advertencias por fila (sin tocar errores, que se agrupan después).
 */
function mergeAdvertencias(
  items: WarningFila[]
): Array<{ fila: number; mensaje: string }> {
  const map = new Map<number, string[]>();
  for (const w of items) {
    const arr = map.get(w.fila) || [];
    arr.push(w.mensaje);
    map.set(w.fila, arr);
  }

  const salida: Array<{ fila: number; mensaje: string }> = [];
  for (const [fila, mensajes] of map.entries()) {
    salida.push({
      fila,
      mensaje: `Se insertó con advertencia${mensajes.length > 1 ? 's' : ''}: ${mensajes.join('; ')}.`,
    });
  }

  return salida.sort((a, b) => a.fila - b.fila);
}

/**
 * Construye el JSON de retorno final del proceso de importación CSV.
 */
export function construirRespuesta(params: {
  procesadas: number;
  insInd: number;
  eqIns: number;
  miemIns: number;
  descartadas: number;
  eqRech: number;
  warnings: WarningFila[];
  errores: ErrorFila[];
  equiposRechazadosArr: { equipo: string; motivo: string }[];
}): ResultadoImportacion {
  const resumen = {
    totalProcesadas: params.procesadas,
    insertadasIndividual: params.insInd,
    equiposInscritos: params.eqIns,
    miembrosInsertados: params.miemIns,
    filasDescartadas: params.descartadas,
    equiposRechazados: params.eqRech,
    totalWarnings: params.warnings.length,
  };

  // Agrupar errores repetidos por mensaje común
  const erroresAgrupados = agruparErroresPorMensaje(params.errores);

  // Agrupar advertencias
  const advertenciasAgrupadas = mergeAdvertencias(params.warnings);

  const algoInsertado = params.insInd > 0 || params.eqIns > 0 || params.miemIns > 0;

  // Si nada se insertó:
  if (!algoInsertado) {
    return {
      ok: false,
      mensaje_error:
        'Procesado pero SIN inserciones en la base de datos. Revise los errores agrupados por equipo o filas relacionadas.',
      resumen,
      advertencias_por_fila: advertenciasAgrupadas,
      errores_por_fila: erroresAgrupados.map((e) => ({
        fila: e.filas,
        mensaje: e.mensaje,
      })) as any,
      equipos_rechazados: params.equiposRechazadosArr,
    };
  }

  // Si hubo éxito parcial o total
  const base = MENSAJES.confirmacionGlobal(resumen);
  const sufijo =
    params.descartadas > 0 || params.eqRech > 0
      ? ' (algunas filas fueron rechazadas o presentaron errores).'
      : '.';

  return {
    ok: true,
    mensaje_exito: `${base}${sufijo}`,
    resumen,
    advertencias_por_fila: advertenciasAgrupadas,
    errores_por_fila: erroresAgrupados.map((e) => ({
      fila: e.filas,
      mensaje: e.mensaje,
    })) as any,
    equipos_rechazados: params.equiposRechazadosArr,
  };
}