// src/services/asignar-area-nivel.service.ts
import { PrismaClient, Rol, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function registrarLog(
    tx: Prisma.TransactionClient,
    params: {
        entidad: string;
        entidad_id?: number | null;
        campo?: string | null;
        valor_anterior?: string | null;
        valor_nuevo?: string | null;
        usuario_id: number;
        motivo?: string | null;
    }
) {
    await tx.logs.create({
        data: {
            entidad: params.entidad,
            entidad_id: params.entidad_id ?? null,
            campo: params.campo ?? null,
            valor_anterior: params.valor_anterior ?? null,
            valor_nuevo: params.valor_nuevo ?? null,
            usuario_id: params.usuario_id,
            motivo: params.motivo ?? null,
        },
    });
}

export class AsignacionesService {
    static async obtenerTabla() {
        const usuarios = await prisma.usuarios.findMany({
            where: { estado: true },
            select: {
                id: true,
                nombre: true,
                ap_paterno: true,
                ap_materno: true,
                rol: true,
                asignaciones: {
                    where: { activo: true },
                    orderBy: { creado_en: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        area: { select: { id: true, nombre: true } },
                        nivel: { select: { id: true, nombre: true } },
                    },
                },
            },
            orderBy: [{ ap_paterno: "asc" }, { ap_materno: "asc" }, { nombre: "asc" }],
        });

        return usuarios.map((u) => {
            const asig = u.asignaciones[0] ?? null;
            return {
                usuarioId: u.id,
                usuario: [u.nombre, u.ap_paterno, u.ap_materno].filter(Boolean).join(" "),
                rol: u.rol,
                asignacionId: asig?.id ?? null,
                area: asig?.area?.nombre ?? "Sin designar",
                nivel: asig?.nivel?.nombre ?? "Sin designar",
                area_id: asig?.area?.id ?? null,
                nivel_id: asig?.nivel?.id ?? null,
            };
        });
    }

    static async obtenerDetalleUsuario(usuarioId: number) {
        const usuario = await prisma.usuarios.findUnique({
            where: { id: usuarioId },
            select: {
                id: true,
                estado: true,
                nombre: true,
                ap_paterno: true,
                ap_materno: true,
                rol: true,
                asignaciones: {
                    where: { activo: true },
                    orderBy: { creado_en: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        area: { select: { id: true, nombre: true } },
                        nivel: { select: { id: true, nombre: true } },
                    },
                },
            },
        });

        if (!usuario) {
            const e: any = new Error("Usuario no encontrado.");
            e.statusCode = 404;
            throw e;
        }
        if (!usuario.estado) {
            const e: any = new Error("El usuario no está activo.");
            e.statusCode = 409;
            throw e;
        }

        const asig = usuario.asignaciones[0] ?? null;

        return {
            usuarioId: usuario.id,
            nombreCompleto: [usuario.nombre, usuario.ap_paterno, usuario.ap_materno].filter(Boolean).join(" "),
            rol: usuario.rol,
            asignacionId: asig?.id ?? null,
            areaActual: asig?.area ?? null,
            nivelActual: asig?.nivel ?? null,
        };
    }

    static async designar(params: {
        actorId: number;
        usuarioId: number;
        areaId: number;
        nivelId: number;
        rol: "RESPONSABLE" | "EVALUADOR";
        motivo?: string;
    }) {
        const { actorId, usuarioId, areaId, nivelId, rol, motivo } = params;

        // Validar catálogos
        const [area, nivel] = await Promise.all([
            prisma.areas.findUnique({ where: { id: areaId } }),
            prisma.niveles.findUnique({ where: { id: nivelId } }),
        ]);

        if (!area || !area.estado) {
            const e: any = new Error("El área especificada no existe o está inactiva.");
            e.statusCode = 400;
            throw e;
        }
        if (!nivel || !nivel.estado) {
            const e: any = new Error("El nivel especificado no existe o está inactivo.");
            e.statusCode = 400;
            throw e;
        }

        return await prisma.$transaction(async (tx) => {
            // Usuario
            const usuario = await tx.usuarios.findUnique({
                where: { id: usuarioId },
                select: { id: true, estado: true, rol: true },
            });

            if (!usuario) {
                const e: any = new Error("Usuario no encontrado.");
                e.statusCode = 404;
                throw e;
            }
            if (!usuario.estado) {
                const e: any = new Error("El usuario no está activo.");
                e.statusCode = 409;
                throw e;
            }

            // Unicidad de RESPONSABLE por (área, nivel)
            if (rol === "RESPONSABLE") {
                const otroResp = await tx.asignaciones.findFirst({
                    where: {
                        activo: true,
                        area_id: areaId,
                        nivel_id: nivelId,
                        usuario: {
                            id: { not: usuarioId },
                            rol: "RESPONSABLE",
                        },
                    },
                    select: { id: true, usuario: { select: { id: true } } },
                });

                if (otroResp) {
                    const e: any = new Error("Ya existe un RESPONSABLE activo para esa combinación de área y nivel.");
                    e.statusCode = 409;
                    throw e;
                }
            }

            // Asignación activa del usuario
            const asignacionActiva = await tx.asignaciones.findFirst({
                where: { usuario_id: usuarioId, activo: true },
                orderBy: { creado_en: "desc" },
            });

            let asignacionFinal = asignacionActiva;

            if (!asignacionActiva) {
                // Crear nueva asignación
                asignacionFinal = await tx.asignaciones.create({
                    data: {
                        usuario_id: usuarioId,
                        area_id: areaId,
                        nivel_id: nivelId,
                        activo: true,
                    },
                });

                await registrarLog(tx, {
                    entidad: "asignaciones",
                    entidad_id: asignacionFinal.id,
                    campo: "CREACION",
                    valor_anterior: null,
                    valor_nuevo: JSON.stringify({ area_id: areaId, nivel_id: nivelId, activo: true }),
                    usuario_id: actorId,
                    motivo,
                });
            } else {
                // Actualizar si cambió área o nivel
                const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
                if (asignacionActiva.area_id !== areaId) {
                    cambios.push({ campo: "area_id", antes: String(asignacionActiva.area_id), despues: String(areaId) });
                }
                if (asignacionActiva.nivel_id !== nivelId) {
                    cambios.push({ campo: "nivel_id", antes: String(asignacionActiva.nivel_id), despues: String(nivelId) });
                }

                if (cambios.length > 0) {
                    asignacionFinal = await tx.asignaciones.update({
                        where: { id: asignacionActiva.id },
                        data: { area_id: areaId, nivel_id: nivelId },
                    });

                    for (const c of cambios) {
                        await registrarLog(tx, {
                            entidad: "asignaciones",
                            entidad_id: asignacionActiva.id,
                            campo: c.campo,
                            valor_anterior: c.antes,
                            valor_nuevo: c.despues,
                            usuario_id: actorId,
                            motivo,
                        });
                    }
                }
            }

            // Actualizar rol del usuario si cambió
            if (usuario.rol !== (rol as Rol)) {
                await tx.usuarios.update({
                    where: { id: usuarioId },
                    data: { rol: rol as Rol },
                });

                await registrarLog(tx, {
                    entidad: "usuarios",
                    entidad_id: usuarioId,
                    campo: "rol",
                    valor_anterior: String(usuario.rol),
                    valor_nuevo: rol,
                    usuario_id: actorId,
                    motivo,
                });
            }

            // Respuesta enriquecida
            const enriched = await tx.asignaciones.findUnique({
                where: { id: asignacionFinal!.id },
                select: {
                    id: true,
                    usuario_id: true,
                    area: { select: { id: true, nombre: true } },
                    nivel: { select: { id: true, nombre: true } },
                },
            });

            return {
                mensaje: "Designación aplicada correctamente.",
                asignacion: enriched,
                rolAplicado: rol,
            };
        });
    }

    static async eliminarAsignacion(params: { actorId: number; asignacionId: number; motivo?: string }) {
        const { actorId, asignacionId, motivo } = params;

        const existente = await prisma.asignaciones.findUnique({
            where: { id: asignacionId },
            select: { id: true, usuario_id: true, area_id: true, nivel_id: true },
        });

        if (!existente) {
            const e: any = new Error("Asignación no encontrada.");
            e.statusCode = 404;
            throw e;
        }

        await prisma.$transaction(async (tx) => {
            await tx.asignaciones.delete({ where: { id: asignacionId } });

            await registrarLog(tx, {
                entidad: "asignaciones",
                entidad_id: asignacionId,
                campo: "ELIMINACION",
                valor_anterior: JSON.stringify({
                    usuario_id: existente.usuario_id,
                    area_id: existente.area_id,
                    nivel_id: existente.nivel_id,
                }),
                valor_nuevo: null,
                usuario_id: actorId,
                motivo,
            });
        });

        return { mensaje: "Asignación eliminada correctamente." };
    }

    static async listarAreasActivas() {
        return prisma.areas.findMany({
            where: { estado: true },
            select: { id: true, nombre: true, codigo: true },
            orderBy: [{ nombre: "asc" }],
        });
    }

    static async listarNivelesActivos() {
        return prisma.niveles.findMany({
            where: { estado: true },
            select: { id: true, nombre: true, codigo: true },
            orderBy: [{ nombre: "asc" }],
        });
    }

    static async rolesPermitidos() {
        return [
            { valor: "RESPONSABLE", etiqueta: "Responsable" },
            { valor: "EVALUADOR", etiqueta: "Evaluador" },
        ];
    }
}
