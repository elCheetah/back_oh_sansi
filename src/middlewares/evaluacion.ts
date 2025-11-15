import { Request, Response, NextFunction } from 'express';

/**
 * Middleware que valida los datos necesarios para registrar una evaluación (nota y comentarios).
 * Verifica la existencia, el tipo (Int) y el rango de los campos clave.
 */
export const validarRegistroEvaluacion = (req: Request, res: Response, next: NextFunction) => {
    // Extraer los datos del cuerpo de la solicitud
    const { participacionId, faseId, nota, comentario, evaluadorId } = req.body;

    // 1. Validar campos obligatorios
    if (!participacionId || !faseId || nota === undefined || !evaluadorId) {
        return res.status(400).json({
            error: 'Faltan campos requeridos.',
            detalle: 'participacionId, faseId, nota y evaluadorId son obligatorios.'
        });
    }

    // 2. Validar tipos de ID (deben ser números enteros, Int)
    const pId = Number(participacionId);
    const fId = Number(faseId);
    const eId = Number(evaluadorId);
    
    // Verificamos que sean números válidos y que sean enteros (tal como se define en el esquema)
    if (isNaN(pId) || isNaN(fId) || isNaN(eId) || !Number.isInteger(pId) || !Number.isInteger(fId) || !Number.isInteger(eId)) {
        return res.status(400).json({
            error: 'participacionId, faseId y evaluadorId deben ser números enteros válidos.',
            recibido: { participacionId, faseId, evaluadorId }
        });
    }

    // 3. Validar Nota (debe ser un número flotante y dentro de un rango de 0 a 100)
    const notaNumerica = parseFloat(nota);
    
    if (isNaN(notaNumerica) || notaNumerica < 0 || notaNumerica > 100) {
        return res.status(400).json({
            error: 'La nota debe ser un valor numérico entre 0.00 y 100.00.',
            recibido: nota
        });
    }

    // 4. Inyectar los IDs convertidos a número y la nota con 2 decimales en el body,
    // asegurando la consistencia antes de pasar al controlador.
    req.body.participacionId = pId;
    req.body.faseId = fId;
    req.body.evaluadorId = eId;
    req.body.nota = notaNumerica.toFixed(2); // Formatea la nota a string con 2 decimales

    // 5. Si todo es correcto, pasa al controlador
    next();
};