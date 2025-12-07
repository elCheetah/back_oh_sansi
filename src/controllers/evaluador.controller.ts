import { Request, Response } from "express";
import { registrarEvaluador } from "../services/evaluador.service";

export class EvaluadorController {
  static async registro(req: Request, res: Response) {
    console.log("BODY REGISTRO EVALUADOR =>", req.body);

    const result = await registrarEvaluador(req.body);

    if (!result.ok) {
      return res
        .status(result.status)
        .json({ ok: false, mensaje: result.error });
    }

    return res.status(result.status).json({
      ok: true,
      usuario: result.data,
    });
  }
}
