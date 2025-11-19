import { Request, Response, NextFunction } from 'express';

/**
 * Middleware que valida los datos necesarios para registrar una evaluación (nota y comentarios).
 * Verifica la existencia, el tipo (Int) y el rango de los campos clave.
 * Incluye validaciones estrictas para el campo 'nota': no texto, no caracteres especiales, no negativos.
 */
export const validarRegistroEvaluacion = (req: Request, res: Response, next: NextFunction) => {
    // Extraer los datos del cuerpo de la solicitud
    const { participacionId, faseId, nota, comentario, evaluadorId } = req.body;

    // --- 1. Validar campos obligatorios ---
    if (!participacionId || !faseId || nota === undefined || !evaluadorId) {
        return res.status(400).json({
            error: 'Faltan campos requeridos.',
            detalle: 'participacionId, faseId, nota y evaluadorId son obligatorios.'
        });
    }

    // --- 2. Validar tipos de ID (deben ser números enteros, Int) ---
    const pId = Number(participacionId);
    const fId = Number(faseId);
    const eId = Number(evaluadorId);
    
    // Verificamos que sean números válidos y que sean enteros
    if (isNaN(pId) || isNaN(fId) || isNaN(eId) || !Number.isInteger(pId) || !Number.isInteger(fId) || !Number.isInteger(eId)) {
        return res.status(400).json({
            error: 'participacionId, faseId y evaluadorId deben ser números enteros válidos.',
            recibido: { participacionId, faseId, evaluadorId }
        });
    }

    // --- 3. Validar Nota: Texto, Espacios y Caracteres Especiales ---
    let notaString = String(nota).trim(); // Eliminar espacios al inicio/fin
    
    // Reemplaza comas por puntos (para manejar formatos latinos)
    notaString = notaString.replace(',', '.'); 
    
    const notaNumerica = parseFloat(notaString);
    
    // Validación 3.A: Verifica si es NaN (contiene texto o caracteres no numéricos)
    if (isNaN(notaNumerica)) {
        return res.status(400).json({
            error: 'La nota es inválida.',
            detalle: 'La nota debe ser un valor numérico y no puede contener texto o caracteres especiales.',
            recibido: notaString
        });
    }
    
    // Validación 3.B: Verifica el rango y negativos
    if (notaNumerica < 0 || notaNumerica > 100) {
        let detalle = 'La nota debe estar dentro del rango de 0.00 a 100.00.';
        
        if (notaNumerica < 0) {
            detalle = 'No se permiten notas negativas.';
        }
        
        return res.status(400).json({
            error: 'La nota está fuera de rango.',
            detalle: detalle,
            recibido: notaString
        });
    }

    // --- 4. Inyectar valores limpios ---
    req.body.participacionId = pId;
    req.body.faseId = fId;
    req.body.evaluadorId = eId;
    req.body.nota = notaNumerica.toFixed(2); // Formatea la nota a string con 2 decimales

    // 5. Si todo es correcto, pasa al controlador
    next();
};