import { google } from 'googleapis';
import { PassThrough } from 'stream';
import {
    Sexo, TipoDocumento, RolEquipo, TipoParticipacion, EstadoParticipacion
} from '@prisma/client';
import prisma from '../config/database';
import { aVacio, mayus, minus, recortar, soloDigitos } from '../utils/importarCSVNormalizacion';
import { enEnumRolEquipo, enEnumSexo, enEnumTipoDoc, esEmail, esFechaISO, gradoPareceValido, validarDepartamento, validarTelefono } from '../utils/importarCSVvalidadores';
import { HEADERS_ESPERADOS } from '../utils/importarCSVParseador';
import { FilaPlano, MensajeFila, ResultadoImportacion, MiembroPreparado, GrupoEquipo } from '../types/importarCSVTypes';

// =================== Google Auth ===================
function getGoogleAuth() {
    return new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        scopes: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/spreadsheets.readonly'
        ],
    });
}

// =================== Helpers de mensajes ===================
function err(n: number, codigo: string, campo: string, valor: string, mensaje: string): MensajeFila {
    return { fila: n, codigo, campo, valor, mensaje };
}
function warn(n: number, codigo: string, campo: string, valor: string, mensaje: string): MensajeFila {
    return { fila: n, codigo, campo, valor, mensaje };
}

// =================== Caché catálogos ===================
const cacheAreas = new Map<string, { id: number; nombre: string }>();
const cacheNiveles = new Map<string, { id: number; nombre: string }>();

async function resolverArea(cod: string, nom: string) {
    const keyCod = cod ? `COD:${mayus(cod)}` : '';
    const keyNom = nom ? `NOM:${mayus(nom)}` : '';
    if (keyCod && cacheAreas.has(keyCod)) return cacheAreas.get(keyCod)!;
    if (keyNom && cacheAreas.has(keyNom)) return cacheAreas.get(keyNom)!;

    let area: { id: number; nombre: string } | null = null;
    if (cod) {
        const a = await prisma.areas.findFirst({ where: { codigo: mayus(cod), estado: true }, select: { id: true, nombre: true } });
        if (a) area = { id: a.id, nombre: a.nombre };
    }
    if (!area && nom) {
        const a = await prisma.areas.findFirst({ where: { nombre: mayus(nom), estado: true }, select: { id: true, nombre: true } });
        if (a) area = { id: a.id, nombre: a.nombre };
    }
    if (area) {
        if (keyCod) cacheAreas.set(keyCod, area);
        if (keyNom) cacheAreas.set(keyNom, area);
    }
    return area;
}

async function resolverNivel(cod: string, nom: string) {
    const keyCod = cod ? `COD:${mayus(cod)}` : '';
    const keyNom = nom ? `NOM:${mayus(nom)}` : '';
    if (keyCod && cacheNiveles.has(keyCod)) return cacheNiveles.get(keyCod)!;
    if (keyNom && cacheNiveles.has(keyNom)) return cacheNiveles.get(keyNom)!;

    let nivel: { id: number; nombre: string } | null = null;
    if (cod) {
        const n = await prisma.niveles.findFirst({ where: { codigo: mayus(cod), estado: true }, select: { id: true, nombre: true } });
        if (n) nivel = { id: n.id, nombre: n.nombre };
    }
    if (!nivel && nom) {
        const n = await prisma.niveles.findFirst({ where: { nombre: mayus(nom), estado: true }, select: { id: true, nombre: true } });
        if (n) nivel = { id: n.id, nombre: n.nombre };
    }
    if (nivel) {
        if (keyCod) cacheNiveles.set(keyCod, nivel);
        if (keyNom) cacheNiveles.set(keyNom, nivel);
    }
    return nivel;
}

// =================== Normalización por fila ===================
function normalizarFila(f: FilaPlano) {
    const rec = (v: string, m: number) => recortar(aVacio(v), m);
    return {
        TIPO_PART: mayus(f.TIPO_PART),
        AREA_COD: mayus(f.AREA_COD),
        AREA_NOM: mayus(f.AREA_NOM),
        NIVEL_COD: mayus(f.NIVEL_COD),
        NIVEL_NOM: mayus(f.NIVEL_NOM),

        OLI_TDOC: mayus(f.OLI_TDOC),
        OLI_NRODOC: rec(f.OLI_NRODOC, 20),
        OLI_NOMBRE: rec(f.OLI_NOMBRE, 100),
        OLI_AP_PAT: rec(f.OLI_AP_PAT, 100),
        OLI_AP_MAT: rec(f.OLI_AP_MAT, 100),
        OLI_UNID_EDU: rec(f.OLI_UNID_EDU, 150),
        OLI_DEPTO: mayus(f.OLI_DEPTO),
        OLI_GRADO: rec(f.OLI_GRADO, 50),
        OLI_F_NAC: aVacio(f.OLI_F_NAC),
        OLI_SEXO: mayus(f.OLI_SEXO),

        TUTOR_TDOC: mayus(f.TUTOR_TDOC),
        TUTOR_NRODOC: rec(f.TUTOR_NRODOC, 20),
        TUTOR_NOMBRE: rec(f.TUTOR_NOMBRE, 100),
        TUTOR_AP_PAT: rec(f.TUTOR_AP_PAT, 100),
        TUTOR_AP_MAT: rec(f.TUTOR_AP_MAT, 100),
        TUTOR_TEL: rec(soloDigitos(f.TUTOR_TEL), 20),
        TUTOR_CORREO: minus(rec(f.TUTOR_CORREO, 150)),
        TUTOR_UNID_EDU: rec(f.TUTOR_UNID_EDU, 150),
        TUTOR_PROF: rec(f.TUTOR_PROF, 150),

        EQUIPO_NOMBRE: rec(f.EQUIPO_NOMBRE, 100),
        ROL_EQUIPO: mayus(f.ROL_EQUIPO),
    };
}

// =================== Validación por fila ===================
async function validarFila(filaNum: number, f: ReturnType<typeof normalizarFila>) {
    const errores: MensajeFila[] = [];
    const warnings: MensajeFila[] = [];

    if (!['INDIVIDUAL', 'EQUIPO'].includes(f.TIPO_PART)) {
        errores.push(err(filaNum, 'E-TIPO-001', 'TIPO_PART', f.TIPO_PART, 'Tipo de participación inválido. Debe ser INDIVIDUAL o EQUIPO.'));
        return { errores, warnings };
    }

    if (!f.AREA_COD && !f.AREA_NOM) {
        errores.push(err(filaNum, 'E-AREA-001', 'AREA_COD/AREA_NOM', '', 'Debe indicar AREA_COD o AREA_NOM.'));
        return { errores, warnings };
    }
    const area = await resolverArea(f.AREA_COD, f.AREA_NOM);
    if (!area) {
        errores.push(err(filaNum, 'E-AREA-002', 'AREA_COD/AREA_NOM', `${f.AREA_COD}/${f.AREA_NOM}`, 'Área no encontrada o inactiva.'));
        return { errores, warnings };
    }
    if (f.AREA_COD && f.AREA_NOM && mayus(area.nombre) !== f.AREA_NOM) {
        errores.push(err(filaNum, 'E-AREA-003', 'AREA_COD/AREA_NOM', `${f.AREA_COD}/${f.AREA_NOM}`, 'Código y nombre de área no coinciden.'));
        return { errores, warnings };
    }

    if (!f.NIVEL_COD && !f.NIVEL_NOM) {
        errores.push(err(filaNum, 'E-NIV-001', 'NIVEL_COD/NIVEL_NOM', '', 'Debe indicar NIVEL_COD o NIVEL_NOM.'));
        return { errores, warnings };
    }
    const nivel = await resolverNivel(f.NIVEL_COD, f.NIVEL_NOM);
    if (!nivel) {
        errores.push(err(filaNum, 'E-NIV-002', 'NIVEL_COD/NIVEL_NOM', `${f.NIVEL_COD}/${f.NIVEL_NOM}`, 'Nivel no encontrado o inactivo.'));
        return { errores, warnings };
    }
    if (f.NIVEL_COD && f.NIVEL_NOM && mayus(nivel.nombre) !== f.NIVEL_NOM) {
        errores.push(err(filaNum, 'E-NIV-003', 'NIVEL_COD/NIVEL_NOM', `${f.NIVEL_COD}/${f.NIVEL_NOM}`, 'Código y nombre de nivel no coinciden.'));
        return { errores, warnings };
    }

    if (!enEnumTipoDoc(f.OLI_TDOC)) errores.push(err(filaNum, 'E-DOC-001', 'OLI_TDOC', f.OLI_TDOC, 'Tipo de documento de olimpista inválido.'));
    if (!f.OLI_NRODOC) errores.push(err(filaNum, 'E-DOC-002', 'OLI_NRODOC', f.OLI_NRODOC, 'Número de documento del olimpista es obligatorio.'));
    if (!f.OLI_NOMBRE || !f.OLI_AP_PAT) errores.push(err(filaNum, 'E-OLI-001', 'OLI_NOMBRE/OLI_AP_PAT', '', 'Nombre y Apellido Paterno del olimpista son obligatorios.'));
    if (!f.OLI_UNID_EDU) errores.push(err(filaNum, 'E-UE-001', 'OLI_UNID_EDU', f.OLI_UNID_EDU, 'Unidad educativa del olimpista es obligatoria.'));
    if (!validarDepartamento(f.OLI_DEPTO)) errores.push(err(filaNum, 'E-DEP-001', 'OLI_DEPTO', f.OLI_DEPTO, 'Departamento inválido.'));
    if (!esFechaISO(f.OLI_F_NAC)) errores.push(err(filaNum, 'E-FNAC-001', 'OLI_F_NAC', f.OLI_F_NAC, 'Fecha de nacimiento inválida (use YYYY-MM-DD).'));
    if (!enEnumSexo(f.OLI_SEXO)) errores.push(err(filaNum, 'E-SEXO-001', 'OLI_SEXO', f.OLI_SEXO, 'Sexo inválido (MASCULINO|FEMENINO|OTRO).'));
    if (!gradoPareceValido(f.OLI_GRADO)) warnings.push(warn(filaNum, 'W-GRADO-001', 'OLI_GRADO', f.OLI_GRADO, 'Formato de grado no estándar; aceptado.'));

    if (!enEnumTipoDoc(f.TUTOR_TDOC)) errores.push(err(filaNum, 'E-DOC-001', 'TUTOR_TDOC', f.TUTOR_TDOC, 'Tipo de documento del tutor inválido.'));
    if (!f.TUTOR_NRODOC) errores.push(err(filaNum, 'E-DOC-002', 'TUTOR_NRODOC', f.TUTOR_NRODOC, 'Número de documento del tutor es obligatorio.'));
    if (!f.TUTOR_NOMBRE || !f.TUTOR_AP_PAT) errores.push(err(filaNum, 'E-TUT-001', 'TUTOR_NOMBRE/TUTOR_AP_PAT', '', 'Nombre y Apellido Paterno del tutor son obligatorios.'));
    if (!validarTelefono(f.TUTOR_TEL)) errores.push(err(filaNum, 'E-TUT-TEL-001', 'TUTOR_TEL', f.TUTOR_TEL, 'Teléfono del tutor inválido (mín. 7 dígitos).'));
    if (!esEmail(f.TUTOR_CORREO)) errores.push(err(filaNum, 'E-TUT-EMAIL-001', 'TUTOR_CORREO', f.TUTOR_CORREO, 'Correo del tutor inválido.'));

    if (f.TIPO_PART === 'INDIVIDUAL') {
        if (f.EQUIPO_NOMBRE || f.ROL_EQUIPO) {
            errores.push(err(filaNum, 'E-CROSS-IND-001', 'EQUIPO_NOMBRE/ROL_EQUIPO', `${f.EQUIPO_NOMBRE}/${f.ROL_EQUIPO}`, 'Para INDIVIDUAL, EQUIPO_NOMBRE y ROL_EQUIPO deben estar vacíos.'));
        }
    } else {
        if (!f.EQUIPO_NOMBRE || !f.ROL_EQUIPO) {
            errores.push(err(filaNum, 'E-CROSS-EQP-001', 'EQUIPO_NOMBRE/ROL_EQUIPO', `${f.EQUIPO_NOMBRE}/${f.ROL_EQUIPO}`, 'Para EQUIPO, EQUIPO_NOMBRE y ROL_EQUIPO son obligatorios.'));
        } else if (!enEnumRolEquipo(f.ROL_EQUIPO)) {
            errores.push(err(filaNum, 'E-ROL-001', 'ROL_EQUIPO', f.ROL_EQUIPO, 'ROL_EQUIPO inválido (LIDER|PARTICIPANTE).'));
        }
    }

    const areaId = (await resolverArea(f.AREA_COD, f.AREA_NOM))?.id;
    const nivelId = (await resolverNivel(f.NIVEL_COD, f.NIVEL_NOM))?.id;

    return { errores, warnings, areaId, nivelId };
}

// =================== Reuso/creación sin actualizar existentes ===================
async function obtenerTutorId(f: ReturnType<typeof normalizarFila>, filaNum: number, warnings: MensajeFila[]) {
    const where = { tipo_documento_numero_documento: { tipo_documento: f.TUTOR_TDOC as TipoDocumento, numero_documento: f.TUTOR_NRODOC } };
    const existente = await prisma.tutores.findUnique({ where });
    if (existente) {
        if (
            mayus(existente.nombre) !== mayus(f.TUTOR_NOMBRE) ||
            mayus(existente.ap_paterno) !== mayus(f.TUTOR_AP_PAT) ||
            mayus(existente.ap_materno || '') !== mayus(f.TUTOR_AP_MAT || '') ||
            minus(existente.correo) !== minus(f.TUTOR_CORREO) ||
            soloDigitos(existente.telefono) !== soloDigitos(f.TUTOR_TEL) ||
            mayus(existente.unidad_educativa) !== mayus(f.TUTOR_UNID_EDU)
        ) {
            warnings.push({ fila: filaNum, codigo: 'W-TUT-DIFF-001', campo: 'TUTOR', valor: `${f.TUTOR_TDOC}-${f.TUTOR_NRODOC}`, mensaje: 'Datos difieren del tutor existente; se reutilizó registro sin sobreescribir.' });
        }
        return { id: existente.id, nuevo: false };
    }
    const creado = await prisma.tutores.create({
        data: {
            nombre: f.TUTOR_NOMBRE, ap_paterno: f.TUTOR_AP_PAT, ap_materno: aVacio(f.TUTOR_AP_MAT) || null,
            tipo_documento: f.TUTOR_TDOC as TipoDocumento, numero_documento: f.TUTOR_NRODOC,
            telefono: f.TUTOR_TEL, correo: f.TUTOR_CORREO,
            unidad_educativa: aVacio(f.TUTOR_UNID_EDU) || '',
            profesion: aVacio(f.TUTOR_PROF) || null
        }
    });
    return { id: creado.id, nuevo: true };
}

async function obtenerOlimpistaId(f: ReturnType<typeof normalizarFila>, filaNum: number, warnings: MensajeFila[], tutorId?: number) {
    const where = { tipo_documento_numero_documento: { tipo_documento: f.OLI_TDOC as TipoDocumento, numero_documento: f.OLI_NRODOC } };
    const existente = await prisma.olimpistas.findUnique({ where });
    if (existente) {
        if (
            mayus(existente.nombre) !== mayus(f.OLI_NOMBRE) ||
            mayus(existente.ap_paterno) !== mayus(f.OLI_AP_PAT) ||
            mayus(existente.ap_materno || '') !== mayus(f.OLI_AP_MAT || '') ||
            mayus(existente.unidad_educativa) !== mayus(f.OLI_UNID_EDU) ||
            mayus(existente.departamento) !== mayus(f.OLI_DEPTO)
        ) {
            warnings.push({ fila: filaNum, codigo: 'W-OLI-DIFF-001', campo: 'OLIMPISTA', valor: `${f.OLI_TDOC}-${f.OLI_NRODOC}`, mensaje: 'Datos difieren del olimpista existente; se reutilizó registro sin sobreescribir.' });
        }
        return { id: existente.id, nuevo: false };
    }
    const creado = await prisma.olimpistas.create({
        data: {
            nombre: f.OLI_NOMBRE, ap_paterno: f.OLI_AP_PAT, ap_materno: aVacio(f.OLI_AP_MAT) || null,
            tipo_documento: f.OLI_TDOC as TipoDocumento, numero_documento: f.OLI_NRODOC,
            unidad_educativa: f.OLI_UNID_EDU, departamento: f.OLI_DEPTO,
            grado: aVacio(f.OLI_GRADO) || null,
            fecha_nacimiento: aVacio(f.OLI_F_NAC) ? new Date(f.OLI_F_NAC) : null,
            sexo: aVacio(f.OLI_SEXO) ? (f.OLI_SEXO as Sexo) : null,
            activo: true,
            tutor_id: tutorId ?? null // solo al CREAR nuevo
        }
    });
    return { id: creado.id, nuevo: true };
}

// =================== Finalizador ===================
function finalizar(
    filasProcesadas: number,
    insertadosInd: number,
    equiposInscritos: number,
    miembrosInsertados: number,
    warnings: MensajeFila[],
    errores: MensajeFila[],
    equiposRechazados: { equipo: string; motivo: string }[]
): ResultadoImportacion {
    const filasDescartadas = errores.length;
    const advertencias = warnings.length;
    const mensaje_exito =
        `Importación completada: ${filasProcesadas} filas procesadas; ` +
        `${insertadosInd} participaciones INDIVIDUALES insertadas; ` +
        `${equiposInscritos} equipos inscritos; ` +
        `${miembrosInsertados} miembros de equipo insertados; ` +
        `${filasDescartadas} filas descartadas; ` +
        `${equiposRechazados.length} equipos rechazados; ` +
        `${advertencias} advertencias.`;

    return {
        ok: true,
        mensaje_exito,
        resumen: {
            filas_procesadas: filasProcesadas,
            insertados_individual: insertadosInd,
            equipos_inscritos: equiposInscritos,
            miembros_insertados: miembrosInsertados,
            filas_descartadas: filasDescartadas,
            equipos_rechazados: equiposRechazados.length,
            advertencias
        },
        advertencias_por_fila: warnings,
        errores_por_fila: errores,
        equipos_rechazados: equiposRechazados
    };
}

// =================== Núcleo de procesamiento ===================
async function procesarFilas(filas: any[]): Promise<ResultadoImportacion> {
    const errores: MensajeFila[] = [];
    const warnings: MensajeFila[] = [];
    const equiposRechazados: { equipo: string; motivo: string }[] = [];

    let filasProcesadas = 0;
    let insertadosInd = 0;
    let equiposInscritos = 0;
    let miembrosInsertados = 0;

    type FilaEnriquecida = ReturnType<typeof normalizarFila> & { __fila: number; __areaId: number; __nivelId: number };
    const normalizadas: FilaEnriquecida[] = [];

    for (let i = 0; i < filas.length; i++) {
        const idx = i + 2; // 1: encabezado
        const n = normalizarFila(filas[i]);
        const val = await validarFila(idx, n);
        warnings.push(...(val.warnings || []));
        if (val.errores.length || !val.areaId || !val.nivelId) {
            errores.push(...val.errores);
            continue;
        }
        normalizadas.push({ ...n, __fila: idx, __areaId: val.areaId, __nivelId: val.nivelId });
    }

    filasProcesadas = filas.length;

    // Separar
    const filasInd = normalizadas.filter(f => f.TIPO_PART === 'INDIVIDUAL');
    const filasEqp = normalizadas.filter(f => f.TIPO_PART === 'EQUIPO');

    // INDIVIDUAL
    const seenInd = new Set<string>();
    for (const f of filasInd) {
        const key = `IND|${f.OLI_TDOC}|${f.OLI_NRODOC}|${f.__areaId}|${f.__nivelId}`;
        if (seenInd.has(key)) {
            warnings.push({ fila: f.__fila, codigo: 'W-IND-DUP-KEEP-001', campo: 'OLI', valor: `${f.OLI_TDOC}-${f.OLI_NRODOC}`, mensaje: 'Fila INDIVIDUAL duplicada en el archivo; se conserva la primera y se descarta esta.' });
            continue;
        }
        seenInd.add(key);

        // ya existe participación?
        const olExist = await prisma.olimpistas.findUnique({ where: { tipo_documento_numero_documento: { tipo_documento: f.OLI_TDOC as TipoDocumento, numero_documento: f.OLI_NRODOC } }, select: { id: true } });
        if (olExist) {
            const part = await prisma.participacion.findUnique({
                where: { olimpista_id_area_id_nivel_id: { olimpista_id: olExist.id, area_id: f.__areaId, nivel_id: f.__nivelId } }
            });
            if (part) {
                errores.push({ fila: f.__fila, codigo: 'E-PART-IND-001', campo: 'Participacion', valor: '', mensaje: 'Participación individual ya existe para el olimpista en área/nivel. Fila descartada.' });
                continue;
            }
        }

        // Insertar
        await prisma.$transaction(async (tx) => {
            const { id: tutorId } = await obtenerTutorId(f, f.__fila, warnings);
            const { id: olimpistaId } = await obtenerOlimpistaId(f, f.__fila, warnings, tutorId);

            await tx.participacion.create({
                data: {
                    tipo: 'INDIVIDUAL' as TipoParticipacion,
                    area_id: f.__areaId, nivel_id: f.__nivelId,
                    olimpista_id: olimpistaId,
                    estado: 'NO_CLASIFICADO' as EstadoParticipacion
                }
            });
        });

        insertadosInd++;
    }

    // EQUIPO
    const grupos = new Map<string, GrupoEquipo>();

    for (const f of filasEqp) {
        const nombre = mayus(f.EQUIPO_NOMBRE);
        const m: MiembroPreparado = {
            fila: f.__fila,
            olimpistaDocKey: `${f.OLI_TDOC}:${f.OLI_NRODOC}`,
            datosFila: f as any,
            rol: f.ROL_EQUIPO as RolEquipo
        };
        if (!grupos.has(nombre)) {
            grupos.set(nombre, { nombre, areaId: f.__areaId, nivelId: f.__nivelId, miembros: [m], filasOrigen: [f.__fila] });
        } else {
            const g = grupos.get(nombre)!;
            if (g.areaId !== f.__areaId || g.nivelId !== f.__nivelId) {
                errores.push({ fila: f.__fila, codigo: 'E-EQP-AREA-001', campo: 'AREA/NIVEL', valor: `${f.AREA_COD || f.AREA_NOM}/${f.NIVEL_COD || f.NIVEL_NOM}`, mensaje: `Equipo ${nombre} con combinación de área/nivel inconsistente. Fila descartada.` });
                continue;
            }
            g.miembros.push(m);
            g.filasOrigen.push(f.__fila);
        }
    }

    for (const [nombre, grupo] of grupos.entries()) {
        const seenDocs = new Set<string>();
        const depurados: MiembroPreparado[] = [];
        for (const m of grupo.miembros) {
            if (seenDocs.has(m.olimpistaDocKey)) {
                warnings.push({ fila: m.fila, codigo: 'W-MIEM-DUP-KEEP-001', campo: 'MIEMBRO', valor: m.olimpistaDocKey, mensaje: `Equipo '${nombre}': miembro repetido; se conserva el primero.` });
                continue;
            }
            seenDocs.add(m.olimpistaDocKey);
            depurados.push(m);
        }

        const tieneLider = depurados.some(x => x.rol === 'LIDER');
        if (!tieneLider && depurados.length > 0) {
            depurados[0].rol = 'LIDER';
            warnings.push({ fila: depurados[0].fila, codigo: 'W-LEAD-AUTO-201', campo: 'ROL_EQUIPO', valor: 'LIDER', mensaje: `Equipo '${nombre}': sin líder; se promovió automáticamente el primer miembro como LIDER.` });
        }

        if (depurados.length < 3) {
            // equipo rechazado
            const motivo = 'E-EQP-MIN-001: menos de 3 miembros válidos.';
            depurados.forEach(m => warnings.push({ fila: m.fila, codigo: 'W-EQP-NO-INSERT', campo: 'EQUIPO', valor: nombre, mensaje: motivo }));
            continue;
        }

        // participación de equipo ya existe?
        const equipoExistente = await prisma.equipos.findUnique({ where: { nombre } });
        let equipoId = equipoExistente?.id;

        if (equipoId) {
            const ya = await prisma.participacion.findUnique({ where: { equipo_id_area_id_nivel_id: { equipo_id: equipoId, area_id: grupo.areaId, nivel_id: grupo.nivelId } } });
            if (ya) {
                const motivo = 'E-PART-EQP-001: participación ya existe en área/nivel.';
                depurados.forEach(m => warnings.push({ fila: m.fila, codigo: 'W-EQP-NO-INSERT', campo: 'EQUIPO', valor: nombre, mensaje: motivo }));
                continue;
            }
        }

        await prisma.$transaction(async (tx) => {
            if (!equipoId) {
                const eq = await tx.equipos.create({ data: { nombre } });
                equipoId = eq.id;
            }

            for (const m of depurados) {
                const f = m.datosFila as any;
                const { id: tutorId } = await obtenerTutorId(f, m.fila, warnings);
                const { id: olimpistaId } = await obtenerOlimpistaId(f, m.fila, warnings, tutorId);

                const yaMiembro = await tx.miembrosEquipo.findUnique({ where: { olimpista_id_equipo_id: { olimpista_id: olimpistaId, equipo_id: equipoId! } } });
                if (!yaMiembro) {
                    await tx.miembrosEquipo.create({ data: { olimpista_id: olimpistaId, equipo_id: equipoId!, rol_en_equipo: m.rol } });
                    miembrosInsertados++;
                }
            }

            await tx.participacion.create({
                data: {
                    tipo: 'EQUIPO' as TipoParticipacion,
                    equipo_id: equipoId!,
                    area_id: grupo.areaId, nivel_id: grupo.nivelId,
                    estado: 'NO_CLASIFICADO' as EstadoParticipacion
                }
            });
            equiposInscritos++;
        });
    }

    return finalizar(filasProcesadas, insertadosInd, equiposInscritos, miembrosInsertados, warnings, errores, []);
}

// =================== Google Sheets: lectura genérica (sin rango del cliente) ===================
async function leerFilasDesdeGoogleSheet(sheetId: string) {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // detectar pestaña con encabezados esperados
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: 'sheets(properties(title))'
    });

    const titulos = (meta.data.sheets || []).map(s => s.properties?.title!).filter(Boolean);
    if (!titulos.length) throw Object.assign(new Error('La hoja no contiene pestañas.'), { status: 400 });

    let pestañaOk: string | null = null;

    for (const title of titulos) {
        const h = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${title}!A1:Z1`,
            valueRenderOption: 'UNFORMATTED_VALUE',
            dateTimeRenderOption: 'FORMATTED_STRING'
        });
        const headers = (h.data.values?.[0] || []).map(v => String(v ?? '').trim().replace(/\s+/g, '_').toUpperCase());
        const coincide = HEADERS_ESPERADOS.every((hh, idx) => headers[idx] === hh);
        if (coincide) { pestañaOk = title; break; }
    }

    if (!pestañaOk) {
        throw Object.assign(new Error('No se encontró una pestaña con los encabezados requeridos.'), { status: 400 });
    }

    // leer A..Z todas las filas con datos
    const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${pestañaOk}!A1:Z`,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
        majorDimension: 'ROWS'
    });

    const values = resp.data.values || [];
    if (!values.length) return [];

    const filas = values.slice(1).map(row => {
        const obj: any = {};
        HEADERS_ESPERADOS.forEach((h, i) => obj[h] = (row[i] ?? '').toString());
        return obj;
    });

    return filas;
}

// =================== Google Drive: subir y convertir a Google Sheet ===================
function inferMime(nombre: string) {
    const n = nombre.toLowerCase();
    if (n.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (n.endsWith('.xls')) return 'application/vnd.ms-excel';
    if (n.endsWith('.csv')) return 'text/csv';
    // por defecto tratamos como xlsx
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

async function subirBufferComoGoogleSheet(buffer: Buffer, nombreOriginal: string): Promise<string> {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    const stream = new PassThrough();
    stream.end(buffer);

    const sourceMime = inferMime(nombreOriginal);
    const metadata = {
        name: nombreOriginal.replace(/\.(xlsx|xls|csv)$/i, ''),
        parents: [String(process.env.GOOGLE_DRIVE_FOLDER_ID)],
        mimeType: 'application/vnd.google-apps.spreadsheet'
    };

    const resp = await drive.files.create({
        requestBody: metadata,
        media: { mimeType: sourceMime, body: stream },
        supportsAllDrives: true,
        fields: 'id'
    });

    const fileId = resp.data.id;
    if (!fileId) throw Object.assign(new Error('No se pudo crear el Google Sheet en Drive.'), { status: 500 });
    return fileId;
}

// =================== API público para el controlador ===================
export async function procesarImportacionUnica(opts: { buffer?: Buffer, filename?: string, sheetId?: string }) {
    let sheetId = opts.sheetId;

    if (!sheetId) {
        if (!opts.buffer || !opts.filename) {
            throw Object.assign(new Error('Debe adjuntar archivo "archivo" o enviar "sheetId".'), { status: 400 });
        }
        // subir a drive (convertir a Google Sheet) y obtener sheetId
        sheetId = await subirBufferComoGoogleSheet(opts.buffer, opts.filename);
    }

    // leer filas desde Google Sheets y procesar
    const filas = await leerFilasDesdeGoogleSheet(sheetId);
    const resultado = await procesarFilas(filas);

    return {
        sheetId,
        hoja_url: `https://docs.google.com/spreadsheets/d/${sheetId}`,
        ...resultado
    };
}
