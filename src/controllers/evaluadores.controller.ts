// src/controllers/evaluadores.controller.ts
import { Request, Response } from "express";
import prisma from "../config/database";
import {
  listarEvaluadoresSrv,
  actualizarEstadoEvaluadorSrv,
} from "../services/evaluadores.service";

type AuthRequest = Request & {
  auth?: {
    id: number;
    nombreCompleto: string;
    rol: "ADMINISTRADOR" | "EVALUADOR" | "RESPONSABLE";
    correo: string;
  };
};

// GET /api/evaluadores
// Devuelve: { idUsuario, documento, nombreCompleto, profesion, institucion, estado, categoriasAsignadas[] }
export async function listarEvaluadoresController(
  _req: AuthRequest,
  res: Response
) {
  try {
    const evaluadores = await listarEvaluadoresSrv();

    const data = evaluadores.map((u: any) => {
      const nombreCompleto = [
        u.nombre,
        u.primer_apellido,
        u.segundo_apellido,
      ]
        .filter(Boolean)
        .join(" ");

      const categoriasAsignadas = (u.asignaciones ?? []).map((asig: any) => ({
        area: asig.categoria.area.nombre,
        nivel: asig.categoria.nivel.nombre,
        modalidad: asig.categoria.modalidad,
      }));

      return {
        idUsuario: u.id,
        documento: `${u.tipo_documento} ${u.numero_documento}`,
        nombreCompleto,
        profesion: u.profesion,
        institucion: u.institucion,
        estado: u.estado, // true / false (activo / inactivo)
        categoriasAsignadas,
      };
    });

    return res.json({
      ok: true,
      total: data.length,
      evaluadores: data,
    });
  } catch (error) {
    console.error("Error al listar evaluadores", error);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_LISTAR_EVALUADORES",
      mensaje: "Ocurrió un error al listar los evaluadores",
    });
  }
}

// PATCH /api/evaluadores/:idUsuario/estado
// Body: { estado: boolean }
export async function actualizarEstadoEvaluadorController(
  req: AuthRequest,
  res: Response
) {
  try {
    const idUsuario = Number(req.params.idUsuario);
    if (isNaN(idUsuario)) {
      return res.status(400).json({
        ok: false,
        codigo: "USUARIO_ID_INVALIDO",
        mensaje: "El id de usuario no es válido",
      });
    }

    const { estado } = req.body as { estado?: unknown };

    if (typeof estado !== "boolean") {
      return res.status(400).json({
        ok: false,
        codigo: "ESTADO_INVALIDO",
        mensaje: "El estado debe ser un valor booleano (true/false)",
      });
    }

    const { usuarioAntes, usuarioDespues } =
      await actualizarEstadoEvaluadorSrv(idUsuario, estado);

    // Log en tabla logs
    const usuarioAuthId = req.auth?.id;
    if (usuarioAuthId) {
      await prisma.logs.create({
        data: {
          entidad: "usuario",
          entidad_id: idUsuario,
          campo: "estado",
          valor_anterior: String(usuarioAntes.estado),
          valor_nuevo: String(usuarioDespues.estado),
          usuario_id: usuarioAuthId,
          motivo: estado
            ? "Habilitación de evaluador"
            : "Inhabilitación de evaluador",
        },
      });
    }

    return res.json({
      ok: true,
      usuario: {
        idUsuario: usuarioDespues.id,
        estado: usuarioDespues.estado,
      },
    });
  } catch (error: any) {
    console.error("Error al actualizar estado de evaluador", error);

    if (error.codigo && error.mensaje) {
      return res.status(400).json({
        ok: false,
        codigo: error.codigo,
        mensaje: error.mensaje,
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ACTUALIZAR_ESTADO_EVALUADOR",
      mensaje: "Ocurrió un error al actualizar el estado del evaluador",
    });
  }
}
