// src/controllers/areasController.ts
import { Request, Response } from 'express';
import prisma from '../config/database';
import { Prisma } from '@prisma/client';

/**
 * Crear una nueva área.
 * - Valida duplicados por nombre o código.
 * - Devuelve 201 con el registro creado o 409 si hay conflicto.
 */
export const crearArea = async (req: Request, res: Response) => {
    const { codigo, nombre, descripcion } = req.body;

    try {
        // Buscar si existe un área activa con el mismo nombre
        const areaPorNombre = await prisma.areas.findFirst({
            where: { estado: true, nombre }
        });

        if (areaPorNombre) {
            return res.status(409).json({ mensaje: `Ya existe un área activa con el nombre "${nombre}".` });
        }

        // Buscar si existe un área activa con el mismo código
        if (codigo) {
            const areaPorCodigo = await prisma.areas.findFirst({
                where: { estado: true, codigo }
            });

            if (areaPorCodigo) {
                return res.status(409).json({ mensaje: `Ya existe un área activa con el código "${codigo}".` });
            }
        }

        // Crear en DB
        const area = await prisma.areas.create({
            data: {
                codigo: codigo ?? null,
                nombre,
                descripcion: descripcion ?? null,
                estado: true
            }
        });

        return res.status(201).json(area);
    } catch (error: any) {
        console.error('crearArea - error:', error);
        return res.status(500).json({ mensaje: 'Error interno al crear el área.' });
    }
};

/**
 * Listar todas las áreas.
 */
export const listarAreas = async (_req: Request, res: Response) => {
    try {
        const areas = await prisma.areas.findMany({
            where: { estado: true },
            orderBy: { nombre: 'asc' }
        });
        return res.status(200).json(areas);
    } catch (error) {
        console.error('listarAreas - error:', error);
        return res.status(500).json({ mensaje: 'Error al obtener las áreas.' });
    }
};

/**
 * Crear un nuevo nivel.
 * Misma lógica que crearArea pero con validaciones de niveles.
 */
export const crearNivel = async (req: Request, res: Response) => {
    const { codigo, nombre, descripcion } = req.body;

    try {
        const nivelPorNombre = await prisma.niveles.findFirst({
            where: { estado: true, nombre }
        });

        if (nivelPorNombre) {
            return res.status(409).json({ mensaje: `Ya existe un nivel activo con el nombre "${nombre}".` });
        }

        if (codigo) {
            const nivelPorCodigo = await prisma.niveles.findFirst({
                where: { estado: true, codigo }
            });

            if (nivelPorCodigo) {
                return res.status(409).json({ mensaje: `Ya existe un nivel activo con el código "${codigo}".` });
            }
        }

        const nivel = await prisma.niveles.create({
            data: {
                codigo: codigo ?? null,
                nombre,
                descripcion: descripcion ?? null,
                estado: true
            }
        });

        return res.status(201).json(nivel);
    } catch (error: any) {
        console.error('crearNivel - error:', error);
        return res.status(500).json({ mensaje: 'Error interno al crear el nivel.' });
    }
};


/**
 * Listar todos los niveles.
 */
export const listarNiveles = async (_req: Request, res: Response) => {
    try {
        const niveles = await prisma.niveles.findMany({
            where: { estado: true },
            orderBy: { nombre: 'asc' }
        });
        return res.status(200).json(niveles);
    } catch (error) {
        console.error('listarNiveles - error:', error);
        return res.status(500).json({ mensaje: 'Error al obtener los niveles.' });
    }
};
/**
 * Actualizar un área por ID
 */
export const actualizarArea = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { codigo, nombre, descripcion } = req.body;

    try {
        // Verificar duplicado en nombre
        const areaPorNombre = await prisma.areas.findFirst({
            where: { estado: true, nombre, id: { not: Number(id) } }
        });

        if (areaPorNombre) {
            return res.status(409).json({ mensaje: `Ya existe otra área activa con el nombre "${nombre}".` });
        }

        // Verificar duplicado en código
        if (codigo) {
            const areaPorCodigo = await prisma.areas.findFirst({
                where: { estado: true, codigo, id: { not: Number(id) } }
            });

            if (areaPorCodigo) {
                return res.status(409).json({ mensaje: `Ya existe otra área activa con el código "${codigo}".` });
            }
        }

        const area = await prisma.areas.update({
            where: { id: Number(id) },
            data: { codigo, nombre, descripcion }
        });

        return res.status(200).json(area);
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ mensaje: 'Área no encontrada.' });
        }
        console.error('actualizarArea - error:', error);
        return res.status(500).json({ mensaje: 'Error al actualizar el área.' });
    }
};

/**
 * Eliminar un área por ID
 */
export const eliminarArea = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const area = await prisma.areas.update({
            where: { id: Number(id) },
            data: { estado: false }
        });

        return res.status(200).json({ mensaje: 'Área desactivada correctamente.', area });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ mensaje: 'Área no encontrada.' });
        }
        console.error('eliminarArea - error:', error);
        return res.status(500).json({ mensaje: 'Error al desactivar el área.' });
    }
};
/**
 * Actualizar un nivel por ID
 */
export const actualizarNivel = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { codigo, nombre, descripcion } = req.body;

    try {
        const nivelPorNombre = await prisma.niveles.findFirst({
            where: { estado: true, nombre, id: { not: Number(id) } }
        });

        if (nivelPorNombre) {
            return res.status(409).json({ mensaje: `Ya existe otro nivel activo con el nombre "${nombre}".` });
        }

        if (codigo) {
            const nivelPorCodigo = await prisma.niveles.findFirst({
                where: { estado: true, codigo, id: { not: Number(id) } }
            });

            if (nivelPorCodigo) {
                return res.status(409).json({ mensaje: `Ya existe otro nivel activo con el código "${codigo}".` });
            }
        }

        const nivel = await prisma.niveles.update({
            where: { id: Number(id) },
            data: { codigo, nombre, descripcion }
        });

        return res.status(200).json(nivel);
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ mensaje: 'Nivel no encontrado.' });
        }
        console.error('actualizarNivel - error:', error);
        return res.status(500).json({ mensaje: 'Error al actualizar el nivel.' });
    }
};


/**
 * Eliminar un nivel por ID
 */
export const eliminarNivel = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const nivel = await prisma.niveles.update({
            where: { id: Number(id) },
            data: { estado: false }
        });

        return res.status(200).json({ mensaje: 'Nivel desactivado correctamente.', nivel });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ mensaje: 'Nivel no encontrado.' });
        }
        console.error('eliminarNivel - error:', error);
        return res.status(500).json({ mensaje: 'Error al desactivar el nivel.' });
    }
};