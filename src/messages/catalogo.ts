export const CATALOGOS = {
  MODALIDAD: ['INDIVIDUAL', 'GRUPAL'] as const,
  OLI_TDOC: ['CI', 'PASAPORTE', 'CARNET_EXTRANJERO'] as const,
  OLI_SEXO: ['MASCULINO', 'FEMENINO', 'OTRO'] as const,
  ROL_EQUIPO: ['LIDER', 'PARTICIPANTE'] as const,
  DEPARTAMENTOS: [
    'COCHABAMBA',
    'LA PAZ',
    'SANTA CRUZ',
    'ORURO',
    'POTOSÍ',
    'CHUQUISACA',
    'TARIJA',
    'BENI',
    'PANDO'
  ] as const
} as const;

export type CodigoError =
  | 'E-TIPO-001'
  | 'E-AREA-001'
  | 'E-AREA-002'
  | 'E-NIV-001'
  | 'E-NIV-002'
  | 'E-CAT-001'
  | 'E-DOC-001'
  | 'E-DOC-002'
  | 'E-OLI-001'
  | 'E-UE-001'
  | 'E-DEP-001'
  | 'E-FNAC-001'
  | 'E-SEXO-001'
  | 'E-OLI-EMAIL-001'
  | 'E-OLI-EMAIL-UNQ-001'
  | 'E-CROSS-IND-001'
  | 'E-CROSS-EQP-001'
  | 'E-ROL-001'
  | 'E-PART-IND-001'
  | 'E-MIEM-001'
  | 'E-EQP-AREA-001'
  | 'E-EQP-EMPTY-001'
  | 'E-EQP-MIN-001'
  | 'E-PART-EQP-001'
  | 'E-MIEM-EXIST-001'
  | 'E-TUT-TEL-001'
  | 'E-TUT-EMAIL-001';

export type CodigoWarning =
  | 'W-OLI-DIFF-001'
  | 'W-TUT-DIFF-001'
  | 'W-MIEM-DUP-KEEP-001'
  | 'W-LEN-001'
  | 'W-GRADO-001'
  | 'W-LEAD-AUTO-201';

export const MENSAJES = {
  confirmacionGlobal: (resumen: {
    totalProcesadas: number;
    insertadasIndividual: number;
    equiposInscritos: number;
    miembrosInsertados: number;
    filasDescartadas: number;
    equiposRechazados: number;
    totalWarnings: number;
  }) =>
    `Importación completada: ${resumen.totalProcesadas} filas procesadas; ` +
    `${resumen.insertadasIndividual} INDIVIDUALES; ` +
    `${resumen.equiposInscritos} equipos; ${resumen.miembrosInsertados} miembros; ` +
    `${resumen.filasDescartadas} filas con error; ${resumen.equiposRechazados} equipos rechazados; ` +
    `${resumen.totalWarnings} advertencias.`,
  errores: {
    'E-TIPO-001': (v: string) => `MODALIDAD='${v}' no es válida (INDIVIDUAL|GRUPAL).`,
    'E-AREA-001': () => `Debe indicar AREA_NOMBRE.`,
    'E-AREA-002': (nom: string) => `Área no encontrada o inactiva (nombre='${nom}').`,
    'E-NIV-001': () => `Debe indicar NIVEL_NOMBRE.`,
    'E-NIV-002': (nom: string) => `Nivel no encontrado o inactivo (nombre='${nom}').`,
    'E-CAT-001': (area: string, nivel: string, modalidad: string) =>
      `No existe una categoría configurada para área='${area}', nivel='${nivel}' y modalidad='${modalidad}'.`,
    'E-DOC-001': (v: string) => `Tipo de documento '${v}' no pertenece al catálogo permitido.`,
    'E-DOC-002': () => `El número de documento es obligatorio.`,
    'E-OLI-001': () => `El nombre y el primer apellido del olimpista son obligatorios.`,
    'E-UE-001': () => `La unidad educativa del olimpista es obligatoria.`,
    'E-DEP-001': (v: string) => `OLI_DEPTO='${v}' no pertenece al catálogo oficial.`,
    'E-FNAC-001': (v: string) => `OLI_F_NAC='${v}' no cumple el formato YYYY-MM-DD.`,
    'E-SEXO-001': (v: string) => `OLI_SEXO='${v}' no es válido (MASCULINO|FEMENINO|OTRO).`,
    'E-OLI-EMAIL-001': (v: string) => `OLI_CORREO='${v}' inválido o vacío.`,
    'E-OLI-EMAIL-UNQ-001': (v: string) => `OLI_CORREO='${v}' ya está en uso por otro olimpista.`,
    'E-CROSS-IND-001': () => `Para MODALIDAD=INDIVIDUAL, EQUIPO_NOMBRE y ROL_EQUIPO deben estar vacíos.`,
    'E-CROSS-EQP-001': () => `Para MODALIDAD=GRUPAL, EQUIPO_NOMBRE y ROL_EQUIPO son obligatorios.`,
    'E-ROL-001': (v: string) => `ROL_EQUIPO='${v}' no es válido (LIDER|PARTICIPANTE).`,
    'E-PART-IND-001': () => `La participación individual ya existe para el olimpista en esa categoría.`,
    'E-MIEM-001': () => `Miembro duplicado en el mismo equipo dentro del archivo.`,
    'E-EQP-AREA-001': () =>
      `Todas las filas de un mismo equipo deben tener la misma combinación de área, nivel y modalidad (misma categoría).`,
    'E-EQP-EMPTY-001': () => `Equipo sin filas válidas tras depuración.`,
    'E-EQP-MIN-001': () => `Equipo con menos de 3 miembros válidos.`,
    'E-PART-EQP-001': () => `La participación del equipo ya existe para esa categoría.`,
    'E-MIEM-EXIST-001': () => `La persona ya figura como miembro de ese equipo en la base de datos.`,
    'E-TUT-TEL-001': (v: string) => `TUTOR_TEL inválido: '${v}'.`,
    'E-TUT-EMAIL-001': (v: string) => `TUTOR_CORREO inválido: '${v}'.`
  } as const,
  warnings: {
    'W-OLI-DIFF-001': () => `Datos difieren del olimpista existente; se reutilizó sin modificar.`,
    'W-TUT-DIFF-001': () => `Datos difieren del tutor existente; se reutilizó sin modificar.`,
    'W-MIEM-DUP-KEEP-001': () => `Miembro repetido; se conservó la primera aparición y se descartó la repetida.`,
    'W-LEN-001': () => `Valor recortado a la longitud máxima permitida.`,
    'W-GRADO-001': () => `OLI_GRADO con formato no estándar; se aceptó.`,
    'W-LEAD-AUTO-201': () => `Sin líder explícito; se promovió automáticamente el primer miembro válido a LIDER.`
  } as const
};
