import { ResultadoImportacion, WarningFila, ErrorFila } from './../types';
import { MENSAJES } from './../messages/catalogo';

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

  const algoInsertado = params.insInd > 0 || params.eqIns > 0 || params.miemIns > 0;

  if (!algoInsertado) {
    return {
      ok: false,
      mensaje_error: 'Procesado pero SIN inserciones en la base de datos. Revise los errores por fila.',
      resumen,
      advertencias_por_fila: params.warnings,
      errores_por_fila: params.errores,
      equipos_rechazados: params.equiposRechazadosArr,
    };
  }

  return {
    ok: true,
    mensaje_exito: MENSAJES.confirmacionGlobal(resumen),
    resumen,
    advertencias_por_fila: params.warnings,
    errores_por_fila: params.errores,
    equipos_rechazados: params.equiposRechazadosArr,
  };
}
