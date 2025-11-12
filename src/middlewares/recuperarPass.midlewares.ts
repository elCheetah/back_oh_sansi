import { Request, Response, NextFunction } from "express";

// PASO 1
export function validarBodySolicitud(req: Request, res: Response, next: NextFunction) {
  const correo = String((req.body ?? {}).correo ?? "").trim();
  if (!correo) return res.status(400).json({ ok: false, message: "Datos incompletos." });
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) && !/\s/.test(correo);
  if (!emailOk) return res.status(400).json({ ok: false, message: "Formato de correo inválido." });
  next();
}

// PASO 2
export function validarBodyVerificacion(req: Request, res: Response, next: NextFunction) {
  const correo = String((req.body ?? {}).correo ?? "").trim();
  const codigo = String((req.body ?? {}).codigo ?? "").trim();

  if (!correo || !codigo) return res.status(400).json({ ok: false, message: "Datos incompletos." });

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) && !/\s/.test(correo);
  if (!emailOk) return res.status(400).json({ ok: false, message: "Formato de correo inválido." });

  if (!/^\d{6}$/.test(codigo)) {
    return res.status(400).json({ ok: false, message: "Código inválido." });
  }

  next();
}

// PASO 3
export function validarBodyReset(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};
  const tokenRecuperacion = String(body.tokenRecuperacion ?? "");
  const nuevaContrasena = String(body.nuevaContrasena ?? "");
  const confirmarContrasena = String(body.confirmarContrasena ?? "");

  if (!tokenRecuperacion || !nuevaContrasena || !confirmarContrasena) {
    return res.status(400).json({ ok: false, message: "Datos incompletos." });
  }

  if (nuevaContrasena !== confirmarContrasena) {
    return res.status(400).json({ ok: false, message: "Las contraseñas no coinciden." });
  }

  // Política: 8+; 1 mayús; 1 minús; 1 número; 1 especial; sin espacios.
  const politicaOk =
    nuevaContrasena.length >= 8 &&
    /[A-Z]/.test(nuevaContrasena) &&
    /[a-z]/.test(nuevaContrasena) &&
    /[0-9]/.test(nuevaContrasena) &&
    /[^A-Za-z0-9\s]/.test(nuevaContrasena) &&
    !/\s/.test(nuevaContrasena);

  if (!politicaOk) {
    return res.status(400).json({
      ok: false,
      message: "Contraseña inválida. Debe tener más de 8 caracteres entre mayúscula, minúscula, número y símbolo, sin espacios.",
    });
  }

  next();
}
