import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

export type TipoArchivo = 'excel' | 'csv';
export const HEADERS_ESPERADOS = [
    "TIPO_PART", "AREA_COD", "AREA_NOM", "NIVEL_COD", "NIVEL_NOM",
    "OLI_TDOC", "OLI_NRODOC", "OLI_NOMBRE", "OLI_AP_PAT", "OLI_AP_MAT",
    "OLI_UNID_EDU", "OLI_DEPTO", "OLI_GRADO", "OLI_F_NAC", "OLI_SEXO",
    "TUTOR_TDOC", "TUTOR_NRODOC", "TUTOR_NOMBRE", "TUTOR_AP_PAT", "TUTOR_AP_MAT",
    "TUTOR_TEL", "TUTOR_CORREO", "TUTOR_UNID_EDU", "TUTOR_PROF",
    "EQUIPO_NOMBRE", "ROL_EQUIPO"
] as const;

export function normalizarEncabezado(h: string) {
    return h?.toString().trim().replace(/\s+/g, '_').toUpperCase();
}
