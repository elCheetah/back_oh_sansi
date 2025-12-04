// src/middlewares/validarAreaNivel.ts
// Validaciones para creación de áreas y niveles
import { Request, Response, NextFunction } from 'express';

export const validarDatosArea = (req: Request, res: Response, next: NextFunction) => {
    const { nombre, codigo, descripcion } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ mensaje: 'El campo "nombre" es obligatorio y debe ser texto.' });
    }
    if (nombre.length > 100) {
        return res.status(400).json({ mensaje: 'El nombre es demasiado largo (máx. 100 caracteres).' });
    }

    if (codigo && (typeof codigo !== 'string' || codigo.length > 50)) {
        return res.status(400).json({ mensaje: 'El campo "codigo" debe ser texto (máx. 50 caracteres).' });
    }

    if (descripcion && typeof descripcion !== 'string') {
        return res.status(400).json({ mensaje: 'El campo "descripcion" debe ser texto.' });
    }

    next();
};

export const validarDatosNivel = (req: Request, res: Response, next: NextFunction) => {
    const { nombre, codigo, descripcion } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ mensaje: 'El campo "nombre" es obligatorio y debe ser texto.' });
    }
    if (nombre.length > 100) {
        return res.status(400).json({ mensaje: 'El nombre es demasiado largo (máx. 100 caracteres).' });
    }

    if (codigo && (typeof codigo !== 'string' || codigo.length > 50)) {
        return res.status(400).json({ mensaje: 'El campo "codigo" debe ser texto (máx. 50 caracteres).' });
    }

    if (descripcion && typeof descripcion !== 'string') {
        return res.status(400).json({ mensaje: 'El campo "descripcion" debe ser texto.' });
    }

    next();
};