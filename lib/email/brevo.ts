/**
 * Brevo Email Service
 * Server-only — for transactional emails
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = 'noreply@medicamentum360.com';
const SENDER_NAME = 'Medicamentum360';

interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

async function sendEmail({ to, subject, htmlContent, textContent }: SendEmailParams) {
  if (!BREVO_API_KEY) {
    console.warn('[Brevo] BREVO_API_KEY not configured — email skipped');
    return { success: false, reason: 'no_api_key' };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent,
        textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[Brevo] Email send failed:', response.status, error);
      return { success: false, reason: 'api_error', status: response.status };
    }

    console.log(`[Brevo] Email sent to ${to}: ${subject}`);
    return { success: true };
  } catch (error) {
    console.error('[Brevo] Email send error:', error instanceof Error ? error.message : error);
    return { success: false, reason: 'network_error' };
  }
}

// ===== Email Templates =====

export async function sendOrderConfirmationEmail({
  to,
  userName,
  orderId,
  items,
  totalCents,
}: {
  to: string;
  userName: string;
  orderId: string;
  items: { title: string; priceCents: number }[];
  totalCents: number;
}) {
  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100);

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-size: 14px;">${item.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; text-align: right;">${formatPrice(item.priceCents)}</td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: #8127cf; color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold;">M3</div>
        <h1 style="color: #333; margin-top: 16px;">¡Compra confirmada!</h1>
      </div>
      
      <p style="color: #555; font-size: 16px;">Hola ${userName},</p>
      <p style="color: #555; font-size: 16px;">Tu compra ha sido procesada exitosamente. Aquí está el resumen:</p>
      
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #666;">Orden #${orderId.slice(-8).toUpperCase()}</p>
        <table style="width: 100%; border-collapse: collapse;">
          ${itemsHtml}
          <tr>
            <td style="padding: 12px; border-top: 2px solid #333; font-weight: bold; font-size: 16px;">Total</td>
            <td style="padding: 12px; border-top: 2px solid #333; font-weight: bold; font-size: 16px; text-align: right;">${formatPrice(totalCents)}</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
           style="display: inline-block; background: #8127cf; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Ir a Mis Cursos
        </a>
      </div>
      
      <p style="color: #888; font-size: 14px; text-align: center;">
        Si tienes alguna pregunta, contáctanos en soporte@medicamentum360.com
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #aaa; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} Medicamentum360 — Plataforma Educativa Médica
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Compra confirmada — Orden #${orderId.slice(-8).toUpperCase()}`,
    htmlContent,
  });
}

export async function sendWelcomeEmail({
  to,
  userName,
}: {
  to: string;
  userName: string;
}) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: #8127cf; color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold;">M3</div>
        <h1 style="color: #333; margin-top: 16px;">¡Bienvenido a Medicamentum360!</h1>
      </div>
      
      <p style="color: #555; font-size: 16px;">Hola ${userName},</p>
      <p style="color: #555; font-size: 16px;">Tu cuenta ha sido creada exitosamente. Ya puedes explorar nuestro catálogo de cursos, experiencias VR y herramientas de IA para profesionales de la salud.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/productos" 
           style="display: inline-block; background: #8127cf; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Explorar catálogo
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #aaa; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} Medicamentum360 — Plataforma Educativa Médica
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: '¡Bienvenido a Medicamentum360!',
    htmlContent,
  });
}
