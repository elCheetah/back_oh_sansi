import prisma from './../config/database';
import { cargarCatalogos } from '../utils/catalogos';
import { validarFila } from './../middlewares/validador-fila';
import { construirRespuesta } from './../middlewares/resumen-importarCSV';
import {
    CandidatoEquipo, CandidatoIndividual, ErrorFila, WarningFila, FilaImportacion, ResultadoImportacion
} from './../types';
import { MENSAJES } from './../messages/catalogo';

type GrupoEquipo = {
    nombre: string;
    areaId: number;
    nivelId: number;
    miembros: (CandidatoEquipo & { filaOriginal: FilaImportacion })[];
    warnings: WarningFila[];
    errores: ErrorFila[];
};

async function correoOlimpistaEnUso(correo: string, docTipo: string, docNum: string): Promise<boolean> {
    const dueñoCorreo = await prisma.olimpistas.findUnique({
        where: { correo },
        select: { tipo_documento: true, numero_documento: true },
    });
    if (!dueñoCorreo) return false;
    return !(dueñoCorreo.tipo_documento === (docTipo as any) && dueñoCorreo.numero_documento === docNum);
}

async function obtenerOlimpistaId(fila: FilaImportacion, warnPush: (w: WarningFila) => void, errPush: (e: ErrorFila) => void, filaNum: number): Promise<number | null> {
    if (await correoOlimpistaEnUso(fila.OLI_CORREO, fila.OLI_TDOC, fila.OLI_NRODOC)) {
        errPush({ fila: filaNum, codigo: 'E-OLI-EMAIL-UNQ-001', columna: 'OLI_CORREO', valor: fila.OLI_CORREO, mensaje: MENSAJES.errores['E-OLI-EMAIL-UNQ-001'](fila.OLI_CORREO) });
        return null;
    }

    const existente = await prisma.olimpistas.findUnique({
        where: {
            tipo_documento_numero_documento: {
                tipo_documento: fila.OLI_TDOC as any,
                numero_documento: fila.OLI_NRODOC,
            },
        },
    });

    if (existente) {
        if (
            (fila.OLI_NOMBRE && fila.OLI_NOMBRE !== existente.nombre) ||
            (fila.OLI_AP_PAT && fila.OLI_AP_PAT !== existente.ap_paterno) ||
            (fila.OLI_AP_MAT && fila.OLI_AP_MAT !== (existente.ap_materno ?? '')) ||
            (fila.OLI_UNID_EDU && fila.OLI_UNID_EDU !== existente.unidad_educativa) ||
            (fila.OLI_DEPTO && fila.OLI_DEPTO !== existente.departamento) ||
            (fila.OLI_CORREO && fila.OLI_CORREO !== existente.correo)
        ) {
            warnPush({
                fila: filaNum,
                codigo: 'W-OLI-DIFF-001',
                mensaje: MENSAJES.warnings['W-OLI-DIFF-001'](),
            });
        }
        return existente.id;
    }

    const creado = await prisma.olimpistas.create({
        data: {
            nombre: fila.OLI_NOMBRE,
            ap_paterno: fila.OLI_AP_PAT,
            ap_materno: fila.OLI_AP_MAT || null,
            tipo_documento: fila.OLI_TDOC as any,
            numero_documento: fila.OLI_NRODOC,
            unidad_educativa: fila.OLI_UNID_EDU,
            departamento: fila.OLI_DEPTO,
            grado: fila.OLI_GRADO || null,
            fecha_nacimiento: fila.OLI_F_NAC ? new Date(fila.OLI_F_NAC) : null,
            sexo: (fila.OLI_SEXO as any) || null,
            activo: true,
            correo: fila.OLI_CORREO,
        },
        select: { id: true },
    });
    return creado.id;
}

async function obtenerTutorId(fila: FilaImportacion, warnPush: (w: WarningFila) => void, filaNum: number): Promise<number> {
    const existente = await prisma.tutores.findUnique({
        where: {
            tipo_documento_numero_documento: {
                tipo_documento: fila.TUTOR_TDOC as any,
                numero_documento: fila.TUTOR_NRODOC,
            },
        },
    });
    if (existente) {
        if (
            (fila.TUTOR_NOMBRE && fila.TUTOR_NOMBRE !== existente.nombre) ||
            (fila.TUTOR_AP_PAT && fila.TUTOR_AP_PAT !== existente.ap_paterno) ||
            (fila.TUTOR_AP_MAT && fila.TUTOR_AP_MAT !== (existente.ap_materno ?? '')) ||
            (fila.TUTOR_TEL && fila.TUTOR_TEL !== existente.telefono) ||
            (fila.TUTOR_CORREO && fila.TUTOR_CORREO !== existente.correo)
        ) {
            warnPush({
                fila: filaNum,
                codigo: 'W-TUT-DIFF-001',
                mensaje: MENSAJES.warnings['W-TUT-DIFF-001'](),
            });
        }
        return existente.id;
    }
    const creado = await prisma.tutores.create({
        data: {
            nombre: fila.TUTOR_NOMBRE,
            ap_paterno: fila.TUTOR_AP_PAT,
            ap_materno: fila.TUTOR_AP_MAT || null,
            tipo_documento: fila.TUTOR_TDOC as any,
            numero_documento: fila.TUTOR_NRODOC,
            telefono: fila.TUTOR_TEL,
            correo: fila.TUTOR_CORREO,
            unidad_educativa: fila.TUTOR_UNID_EDU || fila.OLI_UNID_EDU,
            profesion: fila.TUTOR_PROF || null,
        },
        select: { id: true },
    });
    return creado.id;
}

export async function procesarImportacion(filas: any[]): Promise<ResultadoImportacion> {
    const catalogos = await cargarCatalogos();

    const errores: ErrorFila[] = [];
    const warnings: WarningFila[] = [];

    const candidatosInd: (CandidatoIndividual & { filaOriginal: FilaImportacion })[] = [];
    const candidatosEq: (CandidatoEquipo & { filaOriginal: FilaImportacion })[] = [];

    // 1) Validación por fila
    filas.forEach((raw: any, idx: number) => {
        const { candidato, errores: errs, warnings: warns, fila } = validarFila(idx, raw, catalogos);
        if (errs.length) {
            errores.push(...errs);
        } else {
            if (warns.length) warnings.push(...warns);
            if (candidato?.tipo === 'INDIVIDUAL') {
                candidatosInd.push({ ...(candidato as any), filaOriginal: fila });
            } else if (candidato?.tipo === 'EQUIPO') {
                candidatosEq.push({ ...(candidato as any), filaOriginal: fila });
            }
        }
    });

    // 2) Deduplicación INDIVIDUAL dentro del archivo
    const claveInd = (c: typeof candidatosInd[number]) =>
        `${c.olimpistaDoc.tipo}|${c.olimpistaDoc.numero}|${c.areaId}|${c.nivelId}`;
    const vistosInd = new Set<string>();
    const candidatosIndFiltrados: typeof candidatosInd = [];
    for (const c of candidatosInd) {
        const k = claveInd(c);
        if (vistosInd.has(k)) {
            errores.push({
                fila: c.fila,
                codigo: 'E-PART-IND-001',
                mensaje: MENSAJES.errores['E-PART-IND-001'](),
            });
        } else {
            vistosInd.add(k);
            candidatosIndFiltrados.push(c);
        }
    }

    // 3) Agrupar equipos y deduplicar miembros por equipo
    const grupos = new Map<string, GrupoEquipo>();
    for (const c of candidatosEq) {
        const k = c.equipoNombre;
        if (!grupos.has(k)) {
            grupos.set(k, { nombre: k, areaId: c.areaId, nivelId: c.nivelId, miembros: [], warnings: [], errores: [] });
        }
        const g = grupos.get(k)!;
        if (g.areaId !== c.areaId || g.nivelId !== c.nivelId) {
            g.errores.push({ fila: c.fila, codigo: 'E-EQP-AREA-001', mensaje: MENSAJES.errores['E-EQP-AREA-001']() });
            continue;
        }
        const dup = g.miembros.find(m => m.olimpistaDoc.tipo === c.olimpistaDoc.tipo && m.olimpistaDoc.numero === c.olimpistaDoc.numero);
        if (dup) {
            g.warnings.push({ fila: c.fila, codigo: 'W-MIEM-DUP-KEEP-001', mensaje: MENSAJES.warnings['W-MIEM-DUP-KEEP-001']() });
            continue; // conserva el primero
        }
        g.miembros.push(c);
    }

    // 4) Inserciones
    let insertadasIndividual = 0;
    let equiposInscritos = 0;
    let miembrosInsertados = 0;
    let equiposRechazados = 0;

    // INDIVIDUAL
    for (const c of candidatosIndFiltrados) {
        try {
            const warnPush = (w: WarningFila) => { w.fila = c.fila; warnings.push(w); };
            const errPush = (e: ErrorFila) => { e.fila = c.fila; errores.push(e); };

            const tutorId = await obtenerTutorId(c.filaOriginal, warnPush, c.fila);
            const olimpistaId = await obtenerOlimpistaId(c.filaOriginal, warnPush, errPush, c.fila);
            if (!olimpistaId) continue; // error de correo único ya registrado

            // vincular tutor si faltaba
            const ol = await prisma.olimpistas.findUnique({ where: { id: olimpistaId }, select: { tutor_id: true } });
            if (ol && (!ol.tutor_id || ol.tutor_id !== tutorId)) {
                await prisma.olimpistas.update({ where: { id: olimpistaId }, data: { tutor_id: tutorId } });
            }

            // evitar duplicado en BD
            const existe = await prisma.participacion.findFirst({
                where: { olimpista_id: olimpistaId, area_id: c.areaId, nivel_id: c.nivelId },
                select: { id: true },
            });
            if (existe) {
                errores.push({ fila: c.fila, codigo: 'E-PART-IND-001', mensaje: MENSAJES.errores['E-PART-IND-001']() });
                continue;
            }

            await prisma.participacion.create({
                data: {
                    olimpista_id: olimpistaId,
                    area_id: c.areaId,
                    nivel_id: c.nivelId,
                    tipo: 'INDIVIDUAL',
                    estado: 'NO_CLASIFICADO',
                },
            });
            insertadasIndividual += 1;
        } catch (e: any) {
            errores.push({ fila: c.fila, codigo: 'E-PART-IND-001', mensaje: `Error al insertar participación individual: ${e.message}` });
        }
    }

    // EQUIPO
    const equiposRechazadosArr: { equipo: string; motivo: string }[] = [];
    for (const [nombre, grupo] of grupos.entries()) {
        if (grupo.errores.length) {
            equiposRechazados += 1;
            equiposRechazadosArr.push({ equipo: nombre, motivo: 'Área/Nivel inconsistente entre filas.' });
            errores.push(...grupo.errores);
            continue;
        }

        // Promover líder si falta
        const tieneLider = grupo.miembros.some((m) => m.rolEquipo === 'LIDER');
        if (!tieneLider && grupo.miembros.length > 0) {
            grupo.miembros[0].rolEquipo = 'LIDER';
            grupo.warnings.push({ fila: grupo.miembros[0].fila, codigo: 'W-LEAD-AUTO-201', mensaje: MENSAJES.warnings['W-LEAD-AUTO-201']() });
        }

        // Mínimo 3
        if (grupo.miembros.length < 3) {
            equiposRechazados += 1;
            for (const m of grupo.miembros) {
                errores.push({ fila: m.fila, codigo: 'E-EQP-MIN-001', mensaje: MENSAJES.errores['E-EQP-MIN-001']() });
            }
            equiposRechazadosArr.push({ equipo: nombre, motivo: 'Menos de 3 miembros válidos.' });
            continue;
        }

        try {
            const resultado = await prisma.$transaction(async (tx) => {
                let equipo = await tx.equipos.findUnique({ where: { nombre } });
                if (!equipo) equipo = await tx.equipos.create({ data: { nombre } });

                const yaPart = await tx.participacion.findFirst({
                    where: { equipo_id: equipo.id, area_id: grupo.areaId, nivel_id: grupo.nivelId },
                    select: { id: true },
                });
                if (yaPart) throw new Error(MENSAJES.errores['E-PART-EQP-001']());

                let miembrosCreados = 0;

                for (const m of grupo.miembros) {
                    const warnPush = (w: WarningFila) => { w.fila = m.fila; grupo.warnings.push(w); };
                    const errPush = (e: ErrorFila) => { e.fila = m.fila; grupo.errores.push(e); };

                    // Tutor
                    let tutorIdFinal: number;
                    const tutorExist = await tx.tutores.findUnique({
                        where: { tipo_documento_numero_documento: { tipo_documento: m.filaOriginal.TUTOR_TDOC as any, numero_documento: m.filaOriginal.TUTOR_NRODOC } },
                        select: { id: true, nombre: true, ap_paterno: true, ap_materno: true, telefono: true, correo: true }
                    });
                    if (tutorExist) {
                        warnPush({ fila: m.fila, codigo: 'W-TUT-DIFF-001', mensaje: MENSAJES.warnings['W-TUT-DIFF-001']() });
                        tutorIdFinal = tutorExist.id;
                    } else {
                        const tCre = await tx.tutores.create({
                            data: {
                                nombre: m.filaOriginal.TUTOR_NOMBRE,
                                ap_paterno: m.filaOriginal.TUTOR_AP_PAT,
                                ap_materno: m.filaOriginal.TUTOR_AP_MAT || null,
                                tipo_documento: m.filaOriginal.TUTOR_TDOC as any,
                                numero_documento: m.filaOriginal.TUTOR_NRODOC,
                                telefono: m.filaOriginal.TUTOR_TEL,
                                correo: m.filaOriginal.TUTOR_CORREO,
                                unidad_educativa: m.filaOriginal.TUTOR_UNID_EDU || m.filaOriginal.OLI_UNID_EDU,
                                profesion: m.filaOriginal.TUTOR_PROF || null,
                            },
                            select: { id: true }
                        });
                        tutorIdFinal = tCre.id;
                    }

                    // Correo único por olimpista
                    const emailEnUso = await tx.olimpistas.findUnique({ where: { correo: m.filaOriginal.OLI_CORREO }, select: { tipo_documento: true, numero_documento: true } });
                    if (emailEnUso && !(emailEnUso.tipo_documento === (m.filaOriginal.OLI_TDOC as any) && emailEnUso.numero_documento === m.filaOriginal.OLI_NRODOC)) {
                        throw new Error(MENSAJES.errores['E-OLI-EMAIL-UNQ-001'](m.filaOriginal.OLI_CORREO));
                    }

                    // Olimpista
                    const olExist = await tx.olimpistas.findUnique({
                        where: {
                            tipo_documento_numero_documento: {
                                tipo_documento: m.filaOriginal.OLI_TDOC as any,
                                numero_documento: m.filaOriginal.OLI_NRODOC
                            }
                        },
                        select: { id: true, tutor_id: true }
                    });

                    let olimpistaId: number;
                    if (olExist) {
                        warnPush({ fila: m.fila, codigo: 'W-OLI-DIFF-001', mensaje: MENSAJES.warnings['W-OLI-DIFF-001']() });
                        olimpistaId = olExist.id;
                        if (!olExist.tutor_id || olExist.tutor_id !== tutorIdFinal) {
                            await tx.olimpistas.update({ where: { id: olimpistaId }, data: { tutor_id: tutorIdFinal } });
                        }
                    } else {
                        const olCre = await tx.olimpistas.create({
                            data: {
                                nombre: m.filaOriginal.OLI_NOMBRE,
                                ap_paterno: m.filaOriginal.OLI_AP_PAT,
                                ap_materno: m.filaOriginal.OLI_AP_MAT || null,
                                tipo_documento: m.filaOriginal.OLI_TDOC as any,
                                numero_documento: m.filaOriginal.OLI_NRODOC,
                                unidad_educativa: m.filaOriginal.OLI_UNID_EDU,
                                departamento: m.filaOriginal.OLI_DEPTO,
                                grado: m.filaOriginal.OLI_GRADO || null,
                                fecha_nacimiento: m.filaOriginal.OLI_F_NAC ? new Date(m.filaOriginal.OLI_F_NAC) : null,
                                sexo: (m.filaOriginal.OLI_SEXO as any) || null,
                                activo: true,
                                correo: m.filaOriginal.OLI_CORREO,
                                tutor_id: tutorIdFinal,
                            },
                            select: { id: true }
                        });
                        olimpistaId = olCre.id;
                    }

                    // Miembro duplicado en BD
                    const yaMiembro = await tx.miembrosEquipo.findFirst({
                        where: { equipo_id: equipo.id, olimpista_id: olimpistaId },
                        select: { id: true }
                    });
                    if (yaMiembro) throw new Error(MENSAJES.errores['E-MIEM-EXIST-001']());

                    await tx.miembrosEquipo.create({
                        data: {
                            equipo_id: equipo.id,
                            olimpista_id: olimpistaId,
                            rol_en_equipo: m.rolEquipo,
                        }
                    });
                    miembrosCreados += 1;
                }

                await tx.participacion.create({
                    data: {
                        equipo_id: equipo.id,
                        area_id: grupo.areaId,
                        nivel_id: grupo.nivelId,
                        tipo: 'EQUIPO',
                        estado: 'NO_CLASIFICADO'
                    }
                });

                return { miembrosCreados };
            });

            equiposInscritos += 1;
            miembrosInsertados += resultado.miembrosCreados;
            if (grupo.warnings.length) warnings.push(...grupo.warnings);
        } catch (e: any) {
            equiposRechazados += 1;
            for (const m of grupo.miembros) {
                errores.push({ fila: m.fila, codigo: 'E-PART-EQP-001', mensaje: e.message });
            }
        }
    }

    // Recuento final
    const procesadas = filas.length;
    const filasConError = new Set<number>();
    for (const e of errores) if (e.fila) filasConError.add(e.fila);
    const descartadas = filasConError.size;

    return construirRespuesta({
        procesadas,
        insInd: insertadasIndividual,
        eqIns: equiposInscritos,
        miemIns: miembrosInsertados,
        descartadas,
        eqRech: equiposRechazados,
        warnings,
        errores,
        equiposRechazadosArr: [], // ya informamos por fila; puedes listar por equipo si quieres
    });
}
