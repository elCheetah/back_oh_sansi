// src/types/express.d.ts
import "express";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        id: number;
        jti: string;
        rol: "ADMINISTRADOR" | "EVALUADOR" | "RESPONSABLE";
        correo: string;
        nombreCompleto: string;
      };
    }
  }
}