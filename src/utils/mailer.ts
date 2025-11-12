import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, APP_NAME, APP_FROM } = process.env;

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: Number(SMTP_PORT) === 465, // usa SSL si es 465
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// Verificación al iniciar
transporter.verify()
  .then(() => console.log("📧 Servidor SMTP listo para enviar correos"))
  .catch(err => console.error("❌ Error SMTP:", err));

export async function enviarCorreoBienvenida(destinatario: string, nombre: string) {
  const from = APP_FROM || `"${APP_NAME || 'Olimpiadas'}" <${SMTP_USER}>`;
  const asunto = 'Bienvenido(a) – Cuenta de Evaluador creada';
  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>¡Hola ${nombre}!</h2>
      <p>Tu cuenta de <b>Evaluador</b> fue registrada correctamente.</p>
      <p>Pronto un administrador podrá asignarte un área de evaluación.</p>
      <p>— Equipo ${APP_NAME || 'Olimpiadas'}</p>
    </div>
  `;
  await transporter.sendMail({ from, to: destinatario, subject: asunto, html });
}

/* ========= NUEVO: mailer genérico ========= */
export async function enviarCorreoGenerico(opts: {
  para: string;
  asunto: string;
  html?: string;
  texto?: string;
  nombreRemitente?: string;
}) {
  const from = APP_FROM || `"${opts.nombreRemitente || APP_NAME || 'Olimpiadas'}" <${SMTP_USER}>`;
  await transporter.sendMail({
    from,
    to: opts.para,
    subject: opts.asunto,
    html: opts.html,
    text: opts.texto,
  });
}

/* ========= NUEVO: plantilla para código de recuperación ========= */
export async function enviarCodigoRecuperacion(destinatario: string, nombre: string, codigo: string) {
  const asunto = 'Código de recuperación de contraseña';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px">
      <h2 style="margin:0 0 8px">Recuperación de contraseña</h2>
      <p>Hola ${nombre || 'usuario'}, usa este código para recuperar tu contraseña:</p>
      <div style="font-size:28px;letter-spacing:6px;margin:16px 0"><b>${codigo}</b></div>
      <p>El código vence en <b>2 minutos</b>. Si no lo solicitaste, ignora este mensaje.</p>
      <p>— Equipo ${APP_NAME || 'Olimpiadas'}</p>
    </div>
  `;
  await enviarCorreoGenerico({ para: destinatario, asunto, html });
}
