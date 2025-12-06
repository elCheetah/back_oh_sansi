import { CATALOGOS, MENSAJES } from './../messages/catalogo';
import { normalizarFila, mayus } from '../utils/normalizar';
import { Catalogos } from '../utils/catalogos';
import { CandidatoIndividual, CandidatoEquipo, ErrorFila, WarningFila, FilaImportacion } from './../types';
import { ModalidadCategoria, RolEquipo } from '@prisma/client';

const MAX = {
    nombre: 100,
    unidad_educativa: 150,
    numero_documento: 20,
    correo: 150,
    telefono: 20,
    profesion: 150,
    grado: 50
};

function recortarSiExcede(valor: string, maximo: number): [string, boolean] {
    if (valor.length > maximo) return [valor.slice(0, maximo), true];
    return [valor, false];
}

function validarFechaYYYYMMDD(v: string): boolean {
    if (!v) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v);
    return !isNaN(d.getTime());
}

function emailValido(v: string): boolean {
    return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function etiquetaDeFila(f: any): string {
    const nombre = [f?.OLI_NOMBRE, f?.OLI_PRIMER_AP, f?.OLI_SEGUNDO_AP].filter(Boolean).join(' ');
    const equipo = f?.EQUIPO_NOMBRE;
    if (f?.MODALIDAD === 'GRUPAL' && equipo) return `el equipo "${equipo}"`;
    if (nombre) return nombre;
    return 'la fila';
}

export function validarFila(
    filaIdx: number,
    filaRaw: any,
    cat: Catalogos
): {
    candidato?: CandidatoIndividual | CandidatoEquipo;
    errores: ErrorFila[];
    warnings: WarningFila[];
    fila: FilaImportacion;
} {
    const errores: ErrorFila[] = [];
    const warnings: WarningFila[] = [];

    const filaAny = normalizarFila(filaRaw) as FilaImportacion & Record<string, any>;
    const filaNum = filaIdx + 2;
    const quien = etiquetaDeFila(filaAny);

    const longitudes: Array<{ campo: keyof FilaImportacion; max: number }> = [
        { campo: 'AREA_NOMBRE', max: MAX.nombre },
        { campo: 'NIVEL_NOMBRE', max: MAX.nombre },
        { campo: 'OLI_NRODOC', max: MAX.numero_documento },
        { campo: 'OLI_NOMBRE', max: MAX.nombre },
        { campo: 'OLI_PRIMER_AP', max: MAX.nombre },
        { campo: 'OLI_SEGUNDO_AP', max: MAX.nombre },
        { campo: 'OLI_UNID_EDU', max: MAX.unidad_educativa },
        { campo: 'OLI_DEPTO', max: MAX.nombre },
        { campo: 'OLI_GRADO', max: MAX.grado },
        { campo: 'OLI_CORREO', max: MAX.correo },
        { campo: 'TUTOR_NRODOC', max: MAX.numero_documento },
        { campo: 'TUTOR_NOMBRE', max: MAX.nombre },
        { campo: 'TUTOR_PRIMER_AP', max: MAX.nombre },
        { campo: 'TUTOR_SEGUNDO_AP', max: MAX.nombre },
        { campo: 'TUTOR_TEL', max: MAX.telefono },
        { campo: 'TUTOR_CORREO', max: MAX.correo },
        { campo: 'TUTOR_UNID_EDU', max: MAX.unidad_educativa },
        { campo: 'TUTOR_PROF', max: MAX.profesion },
        { campo: 'EQUIPO_NOMBRE', max: MAX.nombre }
    ];

    for (const { campo, max } of longitudes) {
        const valor = filaAny[campo] as string | undefined;
        if (valor) {
            const [v, rec] = recortarSiExcede(String(valor), max);
            if (rec) {
                warnings.push({
                    fila: filaNum,
                    codigo: 'W-LEN-001',
                    columna: String(campo),
                    valor: valor,
                    mensaje: MENSAJES.warnings['W-LEN-001'](),
                    quien
                });
            }
            filaAny[campo] = v;
        }
    }

    if (!CATALOGOS.MODALIDAD.includes(filaAny.MODALIDAD as any)) {
        errores.push({
            fila: filaNum,
            codigo: 'E-TIPO-001',
            columna: 'MODALIDAD',
            valor: filaAny.MODALIDAD,
            mensaje: MENSAJES.errores['E-TIPO-001'](filaAny.MODALIDAD),
            quien
        });
        return { errores, warnings, fila: filaAny as FilaImportacion };
    }

    const modalidad = filaAny.MODALIDAD as ModalidadCategoria;

    const nomA = filaAny.AREA_NOMBRE;
    if (!nomA) {
        errores.push({
            fila: filaNum,
            codigo: 'E-AREA-001',
            columna: 'AREA_NOMBRE',
            mensaje: MENSAJES.errores['E-AREA-001'](),
            quien
        });
    }

    const nomN = filaAny.NIVEL_NOMBRE;
    if (!nomN) {
        errores.push({
            fila: filaNum,
            codigo: 'E-NIV-001',
            columna: 'NIVEL_NOMBRE',
            mensaje: MENSAJES.errores['E-NIV-001'](),
            quien
        });
    }

    let area: { id: number } | null = null;
    if (nomA) {
        area = cat.areasPorNombre.get(mayus(nomA)) || null;
        if (!area) {
            errores.push({
                fila: filaNum,
                codigo: 'E-AREA-002',
                columna: 'AREA_NOMBRE',
                valor: nomA,
                mensaje: MENSAJES.errores['E-AREA-002'](nomA),
                quien
            });
        }
    }

    let nivel: { id: number } | null = null;
    if (nomN) {
        nivel = cat.nivelesPorNombre.get(mayus(nomN)) || null;
        if (!nivel) {
            errores.push({
                fila: filaNum,
                codigo: 'E-NIV-002',
                columna: 'NIVEL_NOMBRE',
                valor: nomN,
                mensaje: MENSAJES.errores['E-NIV-002'](nomN),
                quien
            });
        }
    }

    if (!area || !nivel) {
        return { errores, warnings, fila: filaAny as FilaImportacion };
    }

    const claveCategoria = `${area.id}|${nivel.id}|${modalidad}`;
    const categoria = cat.categoriasPorClave.get(claveCategoria);

    if (!categoria) {
        errores.push({
            fila: filaNum,
            codigo: 'E-CAT-001',
            columna: 'AREA_NOMBRE/NIVEL_NOMBRE/MODALIDAD',
            valor: `${nomA}|${nomN}|${modalidad}`,
            mensaje: MENSAJES.errores['E-CAT-001'](nomA, nomN, modalidad),
            quien
        });
        return { errores, warnings, fila: filaAny as FilaImportacion };
    }

    if (!CATALOGOS.OLI_TDOC.includes(filaAny.OLI_TDOC as any)) {
        errores.push({
            fila: filaNum,
            codigo: 'E-DOC-001',
            columna: 'OLI_TDOC',
            valor: filaAny.OLI_TDOC,
            mensaje: MENSAJES.errores['E-DOC-001'](filaAny.OLI_TDOC),
            quien
        });
    }

    if (!filaAny.OLI_NRODOC) {
        errores.push({
            fila: filaNum,
            codigo: 'E-DOC-002',
            columna: 'OLI_NRODOC',
            mensaje: MENSAJES.errores['E-DOC-002'](),
            quien
        });
    }

    if (!filaAny.OLI_NOMBRE || !filaAny.OLI_PRIMER_AP) {
        errores.push({
            fila: filaNum,
            codigo: 'E-OLI-001',
            columna: 'OLI_NOMBRE/OLI_PRIMER_AP',
            mensaje: MENSAJES.errores['E-OLI-001'](),
            quien
        });
    }

    if (!filaAny.OLI_UNID_EDU) {
        errores.push({
            fila: filaNum,
            codigo: 'E-UE-001',
            columna: 'OLI_UNID_EDU',
            mensaje: MENSAJES.errores['E-UE-001'](),
            quien
        });
    }

    if (filaAny.OLI_DEPTO && !CATALOGOS.DEPARTAMENTOS.includes(filaAny.OLI_DEPTO as any)) {
        errores.push({
            fila: filaNum,
            codigo: 'E-DEP-001',
            columna: 'OLI_DEPTO',
            valor: filaAny.OLI_DEPTO,
            mensaje: MENSAJES.errores['E-DEP-001'](filaAny.OLI_DEPTO),
            quien
        });
    }

    if (filaAny.OLI_GRADO && !/^(1RO|2DO|3RO|4TO|5TO|6TO)\s+SEC$/i.test(filaAny.OLI_GRADO)) {
        warnings.push({
            fila: filaNum,
            codigo: 'W-GRADO-001',
            columna: 'OLI_GRADO',
            valor: filaAny.OLI_GRADO,
            mensaje: MENSAJES.warnings['W-GRADO-001'](),
            quien
        });
    }

    if (filaAny.OLI_F_NAC && !validarFechaYYYYMMDD(filaAny.OLI_F_NAC)) {
        errores.push({
            fila: filaNum,
            codigo: 'E-FNAC-001',
            columna: 'OLI_F_NAC',
            valor: filaAny.OLI_F_NAC,
            mensaje: MENSAJES.errores['E-FNAC-001'](filaAny.OLI_F_NAC),
            quien
        });
    }

    if (filaAny.OLI_SEXO && !CATALOGOS.OLI_SEXO.includes(filaAny.OLI_SEXO as any)) {
        errores.push({
            fila: filaNum,
            codigo: 'E-SEXO-001',
            columna: 'OLI_SEXO',
            valor: filaAny.OLI_SEXO,
            mensaje: MENSAJES.errores['E-SEXO-001'](filaAny.OLI_SEXO),
            quien
        });
    }

    if (!emailValido(filaAny.OLI_CORREO)) {
        errores.push({
            fila: filaNum,
            codigo: 'E-OLI-EMAIL-001',
            columna: 'OLI_CORREO',
            valor: filaAny.OLI_CORREO,
            mensaje: MENSAJES.errores['E-OLI-EMAIL-001'](filaAny.OLI_CORREO),
            quien
        });
    }

    if (!CATALOGOS.OLI_TDOC.includes(filaAny.TUTOR_TDOC as any)) {
        errores.push({
            fila: filaNum,
            codigo: 'E-DOC-001',
            columna: 'TUTOR_TDOC',
            valor: filaAny.TUTOR_TDOC,
            mensaje: MENSAJES.errores['E-DOC-001'](filaAny.TUTOR_TDOC),
            quien
        });
    }

    if (!filaAny.TUTOR_NRODOC) {
        errores.push({
            fila: filaNum,
            codigo: 'E-DOC-002',
            columna: 'TUTOR_NRODOC',
            mensaje: MENSAJES.errores['E-DOC-002'](),
            quien
        });
    }

    if (!filaAny.TUTOR_NOMBRE || !filaAny.TUTOR_PRIMER_AP) {
        errores.push({
            fila: filaNum,
            codigo: 'E-OLI-001',
            columna: 'TUTOR_NOMBRE/TUTOR_PRIMER_AP',
            mensaje: MENSAJES.errores['E-OLI-001'](),
            quien
        });
    }

    if (!filaAny.TUTOR_TEL || filaAny.TUTOR_TEL.length < 7) {
        errores.push({
            fila: filaNum,
            codigo: 'E-TUT-TEL-001',
            columna: 'TUTOR_TEL',
            valor: filaAny.TUTOR_TEL,
            mensaje: MENSAJES.errores['E-TUT-TEL-001'](filaAny.TUTOR_TEL),
            quien
        });
    }

    if (!emailValido(filaAny.TUTOR_CORREO)) {
        errores.push({
            fila: filaNum,
            codigo: 'E-TUT-EMAIL-001',
            columna: 'TUTOR_CORREO',
            valor: filaAny.TUTOR_CORREO,
            mensaje: MENSAJES.errores['E-TUT-EMAIL-001'](filaAny.TUTOR_CORREO),
            quien
        });
    }

    if (errores.length) return { errores, warnings, fila: filaAny as FilaImportacion };

    if (modalidad === 'INDIVIDUAL') {
        if (filaAny.EQUIPO_NOMBRE || filaAny.ROL_EQUIPO) {
            errores.push({
                fila: filaNum,
                codigo: 'E-CROSS-IND-001',
                mensaje: MENSAJES.errores['E-CROSS-IND-001'](),
                quien
            });
            return { errores, warnings, fila: filaAny as FilaImportacion };
        }

        const candidato: CandidatoIndividual = {
            fila: filaNum,
            modalidad,
            categoriaId: categoria.id,
            areaId: area.id,
            nivelId: nivel.id,
            olimpistaDoc: { tipo: filaAny.OLI_TDOC, numero: filaAny.OLI_NRODOC },
            tutorDoc: { tipo: filaAny.TUTOR_TDOC, numero: filaAny.TUTOR_NRODOC }
        };

        return { candidato, errores, warnings, fila: filaAny as FilaImportacion };
    } else {
        if (!filaAny.EQUIPO_NOMBRE || !filaAny.ROL_EQUIPO) {
            errores.push({
                fila: filaNum,
                codigo: 'E-CROSS-EQP-001',
                mensaje: MENSAJES.errores['E-CROSS-EQP-001'](),
                quien
            });
            return { errores, warnings, fila: filaAny as FilaImportacion };
        }

        if (!CATALOGOS.ROL_EQUIPO.includes(filaAny.ROL_EQUIPO as any)) {
            errores.push({
                fila: filaNum,
                codigo: 'E-ROL-001',
                columna: 'ROL_EQUIPO',
                valor: filaAny.ROL_EQUIPO,
                mensaje: MENSAJES.errores['E-ROL-001'](filaAny.ROL_EQUIPO),
                quien
            });
            return { errores, warnings, fila: filaAny as FilaImportacion };
        }

        const candidato: CandidatoEquipo = {
            fila: filaNum,
            modalidad,
            categoriaId: categoria.id,
            areaId: area.id,
            nivelId: nivel.id,
            equipoNombre: filaAny.EQUIPO_NOMBRE,
            rolEquipo: filaAny.ROL_EQUIPO as RolEquipo,
            olimpistaDoc: { tipo: filaAny.OLI_TDOC, numero: filaAny.OLI_NRODOC },
            tutorDoc: { tipo: filaAny.TUTOR_TDOC, numero: filaAny.TUTOR_NRODOC }
        };

        return { candidato, errores, warnings, fila: filaAny as FilaImportacion };
    }
}
