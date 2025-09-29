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
    // Buscar duplicados por nombre o código
    const existente = await prisma.areas.findFirst({
      where: {
        OR: [
          { nombre: nombre },
          codigo ? { codigo: codigo } : undefined
        ].filter(Boolean) as any[]
      }
    });

    if (existente) {
      return res.status(409).json({ mensaje: 'Ya existe un área con ese nombre o código.' });
    }

    // Crear en DB
    const area = await prisma.areas.create({
      data: {
        codigo: codigo ?? null,
        nombre,
        descripcion: descripcion ?? null
      }
    });

    return res.status(201).json(area);
  } catch (error: any) {
    // Manejar error de unicidad de Prisma (si se definió unique en DB)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ mensaje: 'Violación de unicidad. Ya existe el registro.' });
    }
    console.error('crearArea - error:', error);
    return res.status(500).json({ mensaje: 'Error interno al crear el área.' });
  }
};

/**
 * Listar todas las áreas.
 */
export const listarAreas = async (_req: Request, res: Response) => {
  try {
    const areas = await prisma.areas.findMany({ orderBy: { nombre: 'asc' } });
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
    const existente = await prisma.niveles.findFirst({
      where: {
        OR: [
          { nombre: nombre },
          codigo ? { codigo: codigo } : undefined
        ].filter(Boolean) as any[]
      }
    });

    if (existente) {
      return res.status(409).json({ mensaje: 'Ya existe un nivel con ese nombre o código.' });
    }

    const nivel = await prisma.niveles.create({
      data: {
        codigo: codigo ?? null,
        nombre,
        descripcion: descripcion ?? null
      }
    });

    return res.status(201).json(nivel);
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ mensaje: 'Violación de unicidad. Ya existe el registro.' });
    }
    console.error('crearNivel - error:', error);
    return res.status(500).json({ mensaje: 'Error interno al crear el nivel.' });
  }
};

/**
 * Listar todos los niveles.
 */
export const listarNiveles = async (_req: Request, res: Response) => {
  try {
    const niveles = await prisma.niveles.findMany({ orderBy: { nombre: 'asc' } });
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
    const area = await prisma.areas.update({
      where: { id: Number(id) },
      data: { codigo, nombre, descripcion },
    });

    return res.status(200).json(area);
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma error cuando no encuentra el registro
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
    await prisma.areas.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({ mensaje: 'Área eliminada correctamente.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ mensaje: 'Área no encontrada.' });
    }
    console.error('eliminarArea - error:', error);
    return res.status(500).json({ mensaje: 'Error al eliminar el área.' });
  }
};

/**
 * Actualizar un nivel por ID
 */
export const actualizarNivel = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { codigo, nombre, descripcion } = req.body;

  try {
    const nivel = await prisma.niveles.update({
      where: { id: Number(id) },
      data: { codigo, nombre, descripcion },
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
    await prisma.niveles.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({ mensaje: 'Nivel eliminado correctamente.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ mensaje: 'Nivel no encontrado.' });
    }
    console.error('eliminarNivel - error:', error);
    return res.status(500).json({ mensaje: 'Error al eliminar el nivel.' });
  }
};
