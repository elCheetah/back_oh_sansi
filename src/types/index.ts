import { TipoParticipacion, RolEquipo } from '@prisma/client';
import { CodigoError, CodigoWarning } from './../messages/catalogo';

export type FilaImportacion = {
    TIPO_PART: string;
    AREA_COD: string; AREA_NOM: string;
    NIVEL_COD: string; NIVEL_NOM: string;
    OLI_TDOC: string; OLI_NRODOC: string;
    OLI_NOMBRE: string; OLI_AP_PAT: string; OLI_AP_MAT: string;
    OLI_UNID_EDU: string; OLI_DEPTO: string; OLI_GRADO: string;
    OLI_F_NAC: string; OLI_SEXO: string;
    OLI_CORREO: string;
    TUTOR_TDOC: string; TUTOR_NRODOC: string; TUTOR_NOMBRE: string;
    TUTOR_AP_PAT: string; TUTOR_AP_MAT: string; TUTOR_TEL: string; TUTOR_CORREO: string;
    TUTOR_UNID_EDU: string; TUTOR_PROF: string;
    EQUIPO_NOMBRE: string; ROL_EQUIPO: string;
};

export type ErrorFila = {
    fila: number;
    codigo: CodigoError;
    columna?: string;
    valor?: string;
    mensaje: string;
};

export type WarningFila = {
    fila: number;
    codigo: CodigoWarning;
    columna?: string;
    valor?: string;
    mensaje: string;
};

export type CandidatoComun = {
    fila: number;
    tipo: TipoParticipacion;
    areaId: number;
    nivelId: number;
    olimpistaDoc: { tipo: string; numero: string };
    tutorDoc: { tipo: string; numero: string };
};

export type CandidatoIndividual = CandidatoComun & {
    equipoNombre?: undefined;
    rolEquipo?: undefined;
};

export type CandidatoEquipo = CandidatoComun & {
    equipoNombre: string;
    rolEquipo: RolEquipo;
};

export type ResultadoImportacion = {
    ok: boolean;
    mensaje_exito?: string;     
    mensaje_error?: string;     
    resumen: {
        totalProcesadas: number;
        insertadasIndividual: number;
        equiposInscritos: number;
        miembrosInsertados: number;
        filasDescartadas: number;
        equiposRechazados: number;
        totalWarnings: number;
    };
    advertencias_por_fila: WarningFila[];
    errores_por_fila: ErrorFila[];
    equipos_rechazados: { equipo: string; motivo: string }[];
};
