import { Request, Response } from 'express';
import { procesarImportacionUnica } from '../services/importarCSVService';

export async function importarUnico(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;

  // acepta multipart con archivo o JSON con sheetId
  const body = req.is('application/json') ? (req.body || {}) : {};
  const sheetId = (body as any).sheetId as string | undefined;

  const resultado = await procesarImportacionUnica({
    buffer: file?.buffer,
    filename: file?.originalname,
    sheetId
  });

  return res.json(resultado);
}
