// controllers/evaluador.controller.ts
import { Request, Response } from 'express';
import { registrarEvaluador } from '../services/evaluador.service';

export class EvaluadorController {
  static async registro(req: Request, res: Response) {
    const dto = req.body;
    const result = await registrarEvaluador(dto);

    if (!result.ok) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.status(result.status).json(result.data);
  }
}
