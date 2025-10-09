import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { subirYReemplazarContenido, leerContenidoPrimeraHoja } from './../utils/google-sheet';
import { procesarImportacion } from './../services/importarCSV.service';

const HEADERS_ESPERADOS = [
  'TIPO_PART', 'AREA_COD', 'AREA_NOM', 'NIVEL_COD', 'NIVEL_NOM', 'OLI_TDOC', 'OLI_NRODOC',
  'OLI_NOMBRE', 'OLI_AP_PAT', 'OLI_AP_MAT', 'OLI_UNID_EDU', 'OLI_DEPTO', 'OLI_GRADO',
  'OLI_F_NAC', 'OLI_SEXO', 'OLI_CORREO', 'TUTOR_TDOC', 'TUTOR_NRODOC', 'TUTOR_NOMBRE',
  'TUTOR_AP_PAT', 'TUTOR_AP_MAT', 'TUTOR_TEL', 'TUTOR_CORREO', 'TUTOR_UNID_EDU',
  'TUTOR_PROF', 'EQUIPO_NOMBRE', 'ROL_EQUIPO'
];

function esExtensionSoportada(nombre: string) {
  const n = (nombre || '').toLowerCase();
  return n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv');
}

export async function importarDesdeArchivo(req: Request, res: Response) {
  try {
    if (!('files' in req) || !req.files || !(req.files as any).archivo) {
      return res.status(400).json({ ok: false, mensaje: 'Debe enviar un archivo en el campo "archivo" (xlsx/xls/csv).' });
    }
    const archivo = (req.files as any).archivo as { name: string; data: Buffer; mimetype: string };
    if (!esExtensionSoportada(archivo.name)) {
      return res.status(400).json({ ok: false, mensaje: 'Formato no soportado. Use .xlsx, .xls o .csv.' });
    }
    let filasArchivo: any[] = [];
    try {
      const wb = XLSX.read(archivo.data, { type: 'buffer' });
      const hoja = wb.Sheets[wb.SheetNames[0]];
      filasArchivo = XLSX.utils.sheet_to_json(hoja, { defval: '' });
      if (!filasArchivo.length) {
        return res.status(400).json({ ok: false, mensaje: 'El archivo no tiene filas de datos.' });
      }
    } catch (e: any) {
      console.error('Error al parsear el archivo:', e);
      return res.status(400).json({ ok: false, mensaje: 'No se pudo leer el archivo. Verifique el formato.' });
    }
    try {
      await subirYReemplazarContenido(filasArchivo);
      console.log('Google Sheets actualizado.');
    } catch (e: any) {
      console.error('Falló la sincronización con Google Sheets:', e?.message || e);
    }
    const filas = await leerContenidoPrimeraHoja();
    if (!filas.length) {
      return res.status(400).json({ ok: false, mensaje: 'La primera hoja en Google Sheets está vacía.' });
    }
    const headersLeidos = Object.keys(filas[0]);
    const faltantes = HEADERS_ESPERADOS.filter((h) => !headersLeidos.includes(h));
    if (faltantes.length) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Encabezados faltantes o con nombre incorrecto en la hoja.',
        detalle: { faltantes, headers_recibidos: headersLeidos },
      });
    }
    const resultado = await procesarImportacion(filas);

    const anyIns =
      resultado.resumen.insertadasIndividual > 0 ||
      resultado.resumen.equiposInscritos > 0 ||
      resultado.resumen.miembrosInsertados > 0;

    if (!anyIns) {
      return res.status(400).json({
        ok: false,
        mensaje_error: resultado.mensaje_error || 'Procesado pero NO se insertó nada en la base de datos.',
        resumen: resultado.resumen,
        advertencias_por_fila: resultado.advertencias_por_fila,
        errores_por_fila: resultado.errores_por_fila,
        equipos_rechazados: resultado.equipos_rechazados,
      });
    }
    // Hubo inserciones
    return res.status(200).json(resultado);
  } catch (err: any) {
    console.error('Error no controlado en importarDesdeArchivo:', err);
    return res.status(err?.status || 500).json({
      ok: false,
      mensaje: err?.message || 'Error inesperado al importar.',
    });
  }
}
