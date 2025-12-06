import prisma from './../config/database';
import { cargarCatalogos } from '../utils/catalogos';
import { validarFila } from './../middlewares/validador-fila';
import { construirRespuesta } from './../middlewares/resumen-importarCSV';
import {
    CandidatoEquipo,
    CandidatoIndividual,
    ErrorFila,
    WarningFila,
    FilaImportacion,
    ResultadoImportacion
} from './../types';
import { MENSAJES } from './../messages/catalogo';

type GrupoEquipo = {
    nombre: string;
    categoriaId: number;
    areaId: number;
    nivelId: number;
    miembros: (CandidatoEquipo & { filaOriginal: FilaImportacion })[];
    warnings: WarningFila[];
    errores: ErrorFila[];
};

function etiquetaPersona(f: FilaImportacion): string {
    const nombre = [f.OLI_NOMBRE, f.OLI_PRIMER_AP, f.OLI_SEGUNDO_AP].filter(Boolean).join(' ');
    return nombre || 'la persona';
}

async function correoOlimpistaEnUso(correo: string, docTipo: string, docNum: string): Promise<boolean> {
    const dueñoCorreo = await prisma.olimpistas.findUnique({
        where: { correo },
        select: { tipo_documento: true, numero_documento: true }
    });

    if (!dueñoCorreo) return false;
    return !(dueñoCorreo.tipo_documento === (docTipo as any) && dueñoCorreo.numero_documento === docNum);
}

async function obtenerOlimpistaId(
    fila: FilaImportacion,
    warnPush: (w: WarningFila) => void,
    errPush: (e: ErrorFila) => void,
    filaNum: number
): Promise<number | null> {
    const quien = etiquetaPersona(fila);

    if (await correoOlimpistaEnUso(fila.OLI_CORREO, fila.OLI_TDOC, fila.OLI_NRODOC)) {
        errPush({
            fila: filaNum,
            codigo: 'E-OLI-EMAIL-UNQ-001',
            columna: 'OLI_CORREO',
            valor: fila.OLI_CORREO,
            mensaje: MENSAJES.errores['E-OLI-EMAIL-UNQ-001'](fila.OLI_CORREO),
            quien
        });
        return null;
    }

    const existente = await prisma.olimpistas.findUnique({
        where: {
            tipo_documento_numero_documento: {
                tipo_documento: fila.OLI_TDOC as any,
                numero_documento: fila.OLI_NRODOC
            }
        }
    });

    if (existente) {
        if (
            (fila.OLI_NOMBRE && fila.OLI_NOMBRE !== existente.nombre) ||
            (fila.OLI_PRIMER_AP && fila.OLI_PRIMER_AP !== existente.primer_apellido) ||
            (fila.OLI_SEGUNDO_AP && fila.OLI_SEGUNDO_AP !== (existente.segundo_apellido ?? '')) ||
            (fila.OLI_UNID_EDU && fila.OLI_UNID_EDU !== existente.unidad_educativa) ||
            (fila.OLI_DEPTO && fila.OLI_DEPTO !== existente.departamento) ||
            (fila.OLI_CORREO && fila.OLI_CORREO !== existente.correo)
        ) {
            warnPush({
                fila: filaNum,
                codigo: 'W-OLI-DIFF-001',
                mensaje: MENSAJES.warnings['W-OLI-DIFF-001'](),
                quien
            });
        }
        return existente.id;
    }

    const creado = await prisma.olimpistas.create({
        data: {
            nombre: fila.OLI_NOMBRE,
            primer_apellido: fila.OLI_PRIMER_AP,
            segundo_apellido: fila.OLI_SEGUNDO_AP || null,
            tipo_documento: fila.OLI_TDOC as any,
            numero_documento: fila.OLI_NRODOC,
            unidad_educativa: fila.OLI_UNID_EDU,
            departamento: fila.OLI_DEPTO,
            grado: fila.OLI_GRADO || null,
            fecha_nacimiento: fila.OLI_F_NAC ? new Date(fila.OLI_F_NAC) : null,
            sexo: (fila.OLI_SEXO as any) || null,
            estado: true,
            correo: fila.OLI_CORREO
        },
        select: { id: true }
    });

    return creado.id;
}

async function obtenerTutorId(
    fila: FilaImportacion,
    warnPush: (w: WarningFila) => void,
    filaNum: number
): Promise<number> {
    const quien = etiquetaPersona(fila);

    const existente = await prisma.tutores.findUnique({
        where: {
            tipo_documento_numero_documento: {
                tipo_documento: fila.TUTOR_TDOC as any,
                numero_documento: fila.TUTOR_NRODOC
            }
        }
    });

    if (existente) {
        if (
            (fila.TUTOR_NOMBRE && fila.TUTOR_NOMBRE !== existente.nombre) ||
            (fila.TUTOR_PRIMER_AP && fila.TUTOR_PRIMER_AP !== existente.primer_apellido) ||
            (fila.TUTOR_SEGUNDO_AP && fila.TUTOR_SEGUNDO_AP !== (existente.segundo_apellido ?? '')) ||
            (fila.TUTOR_TEL && fila.TUTOR_TEL !== existente.telefono) ||
            (fila.TUTOR_CORREO && fila.TUTOR_CORREO !== existente.correo)
        ) {
            warnPush({
                fila: filaNum,
                codigo: 'W-TUT-DIFF-001',
                mensaje: MENSAJES.warnings['W-TUT-DIFF-001'](),
                quien
            });
        }
        return existente.id;
    }

    const creado = await prisma.tutores.create({
        data: {
            nombre: fila.TUTOR_NOMBRE,
            primer_apellido: fila.TUTOR_PRIMER_AP,
            segundo_apellido: fila.TUTOR_SEGUNDO_AP || null,
            tipo_documento: fila.TUTOR_TDOC as any,
            numero_documento: fila.TUTOR_NRODOC,
            telefono: fila.TUTOR_TEL,
            correo: fila.TUTOR_CORREO,
            unidad_educativa: fila.TUTOR_UNID_EDU || fila.OLI_UNID_EDU,
            profesion: fila.TUTOR_PROF || null
        },
        select: { id: true }
    });

    return creado.id;
}

export async function procesarImportacion(filas: any[]): Promise<ResultadoImportacion> {
    const catalogos = await cargarCatalogos();

    const errores: ErrorFila[] = [];
    const warnings: WarningFila[] = [];

    const candidatosInd: (CandidatoIndividual & { filaOriginal: FilaImportacion })[] = [];
    const candidatosEq: (CandidatoEquipo & { filaOriginal: FilaImportacion })[] = [];

    filas.forEach((raw: any, idx: number) => {
        const { candidato, errores: errs, warnings: warns, fila } = validarFila(idx, raw, catalogos);

        if (errs.length) {
            errores.push(...errs);
        } else {
            if (warns.length) warnings.push(...warns);

            if (candidato && (candidato as CandidatoIndividual).equipoNombre === undefined) {
                candidatosInd.push({ ...(candidato as CandidatoIndividual), filaOriginal: fila });
            } else if (candidato) {
                candidatosEq.push({ ...(candidato as CandidatoEquipo), filaOriginal: fila });
            }
        }
    });

    const claveInd = (c: typeof candidatosInd[number]) =>
        `${c.olimpistaDoc.tipo}|${c.olimpistaDoc.numero}|${c.categoriaId}`;

    const vistosInd = new Set<string>();
    const candidatosIndFiltrados: typeof candidatosInd = [];

    for (const c of candidatosInd) {
        const k = claveInd(c);
        if (vistosInd.has(k)) {
            errores.push({
                fila: c.fila,
                codigo: 'E-PART-IND-001',
                mensaje: MENSAJES.errores['E-PART-IND-001'](),
                quien: etiquetaPersona(c.filaOriginal)
            });
        } else {
            vistosInd.add(k);
            candidatosIndFiltrados.push(c);
        }
    }

    const grupos = new Map<string, GrupoEquipo>();

    for (const c of candidatosEq) {
        const k = `${c.equipoNombre}|${c.categoriaId}`;

        if (!grupos.has(k)) {
            grupos.set(k, {
                nombre: c.equipoNombre,
                categoriaId: c.categoriaId,
                areaId: c.areaId,
                nivelId: c.nivelId,
                miembros: [],
                warnings: [],
                errores: []
            });
        }

        const g = grupos.get(k)!;

        if (g.categoriaId !== c.categoriaId || g.areaId !== c.areaId || g.nivelId !== c.nivelId) {
            g.errores.push({
                fila: c.fila,
                codigo: 'E-EQP-AREA-001',
                mensaje: MENSAJES.errores['E-EQP-AREA-001'](),
                quien: `el equipo "${g.nombre}"`
            });
            continue;
        }

        const dup = g.miembros.find(
            (m) => m.olimpistaDoc.tipo === c.olimpistaDoc.tipo && m.olimpistaDoc.numero === c.olimpistaDoc.numero
        );

        if (dup) {
            g.warnings.push({
                fila: c.fila,
                codigo: 'W-MIEM-DUP-KEEP-001',
                mensaje: MENSAJES.warnings['W-MIEM-DUP-KEEP-001'](),
                quien: `el equipo "${g.nombre}"`
            });
            continue;
        }

        g.miembros.push(c);
    }

    let insertadasIndividual = 0;
    let equiposInscritos = 0;
    let miembrosInsertados = 0;
    let equiposRechazados = 0;

    for (const c of candidatosIndFiltrados) {
        try {
            const warnPush = (w: WarningFila) => {
                w.fila = c.fila;
                w.quien = etiquetaPersona(c.filaOriginal);
                warnings.push(w);
            };

            const errPush = (e: ErrorFila) => {
                e.fila = c.fila;
                e.quien = etiquetaPersona(c.filaOriginal);
                errores.push(e);
            };

            const tutorId = await obtenerTutorId(c.filaOriginal, warnPush, c.fila);
            const olimpistaId = await obtenerOlimpistaId(c.filaOriginal, warnPush, errPush, c.fila);
            if (!olimpistaId) continue;

            const ol = await prisma.olimpistas.findUnique({
                where: { id: olimpistaId },
                select: { tutor_id: true }
            });

            if (ol && (!ol.tutor_id || ol.tutor_id !== tutorId)) {
                await prisma.olimpistas.update({
                    where: { id: olimpistaId },
                    data: { tutor_id: tutorId }
                });
            }

            const existe = await prisma.participacion.findFirst({
                where: { olimpista_id: olimpistaId, categoria_id: c.categoriaId },
                select: { id: true }
            });

            if (existe) {
                errores.push({
                    fila: c.fila,
                    codigo: 'E-PART-IND-001',
                    mensaje: MENSAJES.errores['E-PART-IND-001'](),
                    quien: etiquetaPersona(c.filaOriginal)
                });
                continue;
            }

            await prisma.participacion.create({
                data: {
                    categoria_id: c.categoriaId,
                    olimpista_id: olimpistaId,
                    estado: 'NO_CLASIFICADO'
                }
            });

            insertadasIndividual += 1;
        } catch (e: any) {
            errores.push({
                fila: c.fila,
                codigo: 'E-PART-IND-001',
                mensaje: `Error al insertar participación individual: ${e.message}`,
                quien: etiquetaPersona(c.filaOriginal)
            });
        }
    }

    const equiposRechazadosArr: { equipo: string; motivo: string }[] = [];

    for (const [, grupo] of grupos.entries()) {
        if (grupo.errores.length) {
            equiposRechazados += 1;
            equiposRechazadosArr.push({
                equipo: grupo.nombre,
                motivo: 'Categoría inconsistente entre filas del equipo.'
            });

            for (const e of grupo.errores) {
                e.quien = e.quien || `el equipo "${grupo.nombre}"`;
            }

            errores.push(...grupo.errores);
            continue;
        }

        const tieneLider = grupo.miembros.some((m) => m.rolEquipo === 'LIDER');

        if (!tieneLider && grupo.miembros.length > 0) {
            grupo.miembros[0].rolEquipo = 'LIDER';
            grupo.warnings.push({
                fila: grupo.miembros[0].fila,
                codigo: 'W-LEAD-AUTO-201',
                mensaje: MENSAJES.warnings['W-LEAD-AUTO-201'](),
                quien: `el equipo "${grupo.nombre}"`
            });
        }

        if (grupo.miembros.length < 3) {
            equiposRechazados += 1;

            for (const m of grupo.miembros) {
                errores.push({
                    fila: m.fila,
                    codigo: 'E-EQP-MIN-001',
                    mensaje: MENSAJES.errores['E-EQP-MIN-001'](),
                    quien: `el equipo "${grupo.nombre}"`
                });
            }

            equiposRechazadosArr.push({ equipo: grupo.nombre, motivo: 'Menos de 3 miembros válidos.' });
            continue;
        }

        try {
            const resultado = await prisma.$transaction(async (tx) => {
                let equipo = await tx.equipos.findUnique({ where: { nombre: grupo.nombre } });
                if (!equipo) {
                    equipo = await tx.equipos.create({ data: { nombre: grupo.nombre } });
                }

                const yaPart = await tx.participacion.findFirst({
                    where: { equipo_id: equipo.id, categoria_id: grupo.categoriaId },
                    select: { id: true }
                });

                if (yaPart) {
                    throw new Error(MENSAJES.errores['E-PART-EQP-001']());
                }

                let miembrosCreados = 0;

                for (const m of grupo.miembros) {
                    const warnPush = (w: WarningFila) => {
                        w.fila = m.fila;
                        w.quien = `el equipo "${grupo.nombre}"`;
                        grupo.warnings.push(w);
                    };

                    let tutorIdFinal: number;

                    const tutorExist = await tx.tutores.findUnique({
                        where: {
                            tipo_documento_numero_documento: {
                                tipo_documento: m.filaOriginal.TUTOR_TDOC as any,
                                numero_documento: m.filaOriginal.TUTOR_NRODOC
                            }
                        },
                        select: { id: true }
                    });

                    if (tutorExist) {
                        warnPush({
                            fila: m.fila,
                            codigo: 'W-TUT-DIFF-001',
                            mensaje: MENSAJES.warnings['W-TUT-DIFF-001'](),
                            quien: `el equipo "${grupo.nombre}"`
                        });
                        tutorIdFinal = tutorExist.id;
                    } else {
                        const tCre = await tx.tutores.create({
                            data: {
                                nombre: m.filaOriginal.TUTOR_NOMBRE,
                                primer_apellido: m.filaOriginal.TUTOR_PRIMER_AP,
                                segundo_apellido: m.filaOriginal.TUTOR_SEGUNDO_AP || null,
                                tipo_documento: m.filaOriginal.TUTOR_TDOC as any,
                                numero_documento: m.filaOriginal.TUTOR_NRODOC,
                                telefono: m.filaOriginal.TUTOR_TEL,
                                correo: m.filaOriginal.TUTOR_CORREO,
                                unidad_educativa: m.filaOriginal.TUTOR_UNID_EDU || m.filaOriginal.OLI_UNID_EDU,
                                profesion: m.filaOriginal.TUTOR_PROF || null
                            },
                            select: { id: true }
                        });
                        tutorIdFinal = tCre.id;
                    }

                    const emailEnUso = await tx.olimpistas.findUnique({
                        where: { correo: m.filaOriginal.OLI_CORREO },
                        select: { tipo_documento: true, numero_documento: true }
                    });

                    if (
                        emailEnUso &&
                        !(
                            emailEnUso.tipo_documento === (m.filaOriginal.OLI_TDOC as any) &&
                            emailEnUso.numero_documento === m.filaOriginal.OLI_NRODOC
                        )
                    ) {
                        throw new Error(MENSAJES.errores['E-OLI-EMAIL-UNQ-001'](m.filaOriginal.OLI_CORREO));
                    }

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
                        warnPush({
                            fila: m.fila,
                            codigo: 'W-OLI-DIFF-001',
                            mensaje: MENSAJES.warnings['W-OLI-DIFF-001'](),
                            quien: `el equipo "${grupo.nombre}"`
                        });
                        olimpistaId = olExist.id;

                        if (!olExist.tutor_id || olExist.tutor_id !== tutorIdFinal) {
                            await tx.olimpistas.update({
                                where: { id: olimpistaId },
                                data: { tutor_id: tutorIdFinal }
                            });
                        }
                    } else {
                        const olCre = await tx.olimpistas.create({
                            data: {
                                nombre: m.filaOriginal.OLI_NOMBRE,
                                primer_apellido: m.filaOriginal.OLI_PRIMER_AP,
                                segundo_apellido: m.filaOriginal.OLI_SEGUNDO_AP || null,
                                tipo_documento: m.filaOriginal.OLI_TDOC as any,
                                numero_documento: m.filaOriginal.OLI_NRODOC,
                                unidad_educativa: m.filaOriginal.OLI_UNID_EDU,
                                departamento: m.filaOriginal.OLI_DEPTO,
                                grado: m.filaOriginal.OLI_GRADO || null,
                                fecha_nacimiento: m.filaOriginal.OLI_F_NAC ? new Date(m.filaOriginal.OLI_F_NAC) : null,
                                sexo: (m.filaOriginal.OLI_SEXO as any) || null,
                                estado: true,
                                correo: m.filaOriginal.OLI_CORREO,
                                tutor_id: tutorIdFinal
                            },
                            select: { id: true }
                        });
                        olimpistaId = olCre.id;
                    }

                    const yaMiembro = await tx.miembrosEquipo.findFirst({
                        where: { equipo_id: equipo.id, olimpista_id: olimpistaId },
                        select: { id: true }
                    });

                    if (yaMiembro) {
                        throw new Error(MENSAJES.errores['E-MIEM-EXIST-001']());
                    }

                    await tx.miembrosEquipo.create({
                        data: {
                            equipo_id: equipo.id,
                            olimpista_id: olimpistaId,
                            rol_en_equipo: m.rolEquipo
                        }
                    });

                    miembrosCreados += 1;
                }

                await tx.participacion.create({
                    data: {
                        equipo_id: equipo.id,
                        categoria_id: grupo.categoriaId,
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
                errores.push({
                    fila: m.fila,
                    codigo: 'E-PART-EQP-001',
                    mensaje: e.message,
                    quien: `el equipo "${grupo.nombre}"`
                });
            }
        }
    }

    const procesadas = filas.length;
    const filasConError = new Set<number>();

    for (const e of errores) {
        if (e.fila) filasConError.add(e.fila);
    }

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
        equiposRechazadosArr
    });
}
