import { ResultadoImportacion, WarningFila, ErrorFila } from './../types';
import { MENSAJES } from './../messages/catalogo';

function mergeByFila(
  items: Array<ErrorFila | WarningFila>,
  opts: { prefixOk: string; prefixFail: string; isError: boolean }
): Array<{ fila: number; mensaje: string }> {
  const map = new Map<number, { quien?: string; mensajes: string[] }>();

  for (const it of items) {
    const entry = map.get(it.fila) || { quien: it.quien, mensajes: [] };
    if (!entry.quien && it.quien) entry.quien = it.quien;
    const texto = it.mensaje || '';
    if (texto) entry.mensajes.push(texto);
    map.set(it.fila, entry);
  }

  const result: Array<{ fila: number; mensaje: string }> = [];
  for (const [fila, info] of map.entries()) {
    const sujeto = info.quien ? info.quien : `la fila ${fila}`;
    const joined = info.mensajes.join('; ');
    const m =
      opts.isError
        ? `${opts.prefixFail} ${sujeto} porque: ${joined}.`
        : `${opts.prefixOk} ${sujeto}${joined ? `: ${joined}.` : '.'}`;
    result.push({ fila, mensaje: m });
  }
  result.sort((a, b) => a.fila - b.fila);
  return result;
}

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
  const erroresConsolidados = mergeByFila(params.errores, {
    isError: true,
    prefixFail: 'No se insertó a',
    prefixOk: '',
  });

  const advertenciasConsolidadas = mergeByFila(params.warnings, {
    isError: false,
    prefixOk: 'Se insertó con advertencia a',
    prefixFail: '',
  });

  const algoInsertado = params.insInd > 0 || params.eqIns > 0 || params.miemIns > 0;

  if (!algoInsertado) {
    return {
      ok: false,
      mensaje_error: 'Procesado pero SIN inserciones en la base de datos. Revise los errores por fila.',
      resumen,
      advertencias_por_fila: advertenciasConsolidadas.map(a => ({ fila: a.fila, mensaje: a.mensaje } as any)),
      errores_por_fila: erroresConsolidados.map(e => ({ fila: e.fila, mensaje: e.mensaje } as any)),
      equipos_rechazados: params.equiposRechazadosArr,
    };
  }
  const base = MENSAJES.confirmacionGlobal(resumen);
  const cualificador =
    params.descartadas > 0 || params.eqRech > 0
      ? ' (se encontraron filas con error que fueron rechazadas)'
      : '';
  const mensaje_exito = `${base}${cualificador}`;

  return {
    ok: true,
    mensaje_exito,
    resumen,
    advertencias_por_fila: advertenciasConsolidadas.map(a => ({ fila: a.fila, mensaje: a.mensaje } as any)),
    errores_por_fila: erroresConsolidados.map(e => ({ fila: e.fila, mensaje: e.mensaje } as any)),
    equipos_rechazados: params.equiposRechazadosArr,
  };
}
