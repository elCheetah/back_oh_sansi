import { ModalidadCategoria, RolEquipo } from '@prisma/client';
import { CodigoError, CodigoWarning } from './../messages/catalogo';

export type FilaImportacion = {
  MODALIDAD: string;
  AREA_NOMBRE: string;
  NIVEL_NOMBRE: string;
  OLI_TDOC: string;
  OLI_NRODOC: string;
  OLI_NOMBRE: string;
  OLI_PRIMER_AP: string;
  OLI_SEGUNDO_AP: string;
  OLI_UNID_EDU: string;
  OLI_DEPTO: string;
  OLI_GRADO: string;
  OLI_F_NAC: string;
  OLI_SEXO: string;
  OLI_CORREO: string;
  TUTOR_TDOC: string;
  TUTOR_NRODOC: string;
  TUTOR_NOMBRE: string;
  TUTOR_PRIMER_AP: string;
  TUTOR_SEGUNDO_AP: string;
  TUTOR_TEL: string;
  TUTOR_CORREO: string;
  TUTOR_UNID_EDU: string;
  TUTOR_PROF: string;
  EQUIPO_NOMBRE: string;
  ROL_EQUIPO: string;
};

export type ErrorFila = {
  fila: number;
  codigo: CodigoError;
  columna?: string;
  valor?: string;
  mensaje: string;
  quien?: string;
};

export type WarningFila = {
  fila: number;
  codigo: CodigoWarning;
  columna?: string;
  valor?: string;
  mensaje: string;
  quien?: string;
};

export type CandidatoComun = {
  fila: number;
  modalidad: ModalidadCategoria;
  categoriaId: number;
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
  advertencias_por_fila: Array<{ fila: number; mensaje: string }>;
  errores_por_fila: Array<{ fila: number; mensaje: string }>;
  equipos_rechazados: { equipo: string; motivo: string }[];
};
