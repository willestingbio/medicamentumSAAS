const BREVO_API_URL = 'https://api.brevo.com/v3';

interface SendEmailParams {
  to: { email: string; name?: string };
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY no configurada');
  }

  const res = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: 'Medicamentum360',
        email: 'noreply@medicamentum360.com',
      },
      to: [to],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo error ${res.status}: ${body}`);
  }

  return res.json();
}
