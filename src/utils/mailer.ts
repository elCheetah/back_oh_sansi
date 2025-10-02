// utils/mailer.ts
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, APP_NAME, APP_FROM } = process.env;

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: Number(SMTP_PORT) === 465, // usa SSL si es 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
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
