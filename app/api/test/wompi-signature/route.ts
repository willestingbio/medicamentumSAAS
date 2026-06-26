import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * Diagnostic endpoint to verify Wompi integrity signature generation.
 * Only works in development mode.
 *
 * Usage: GET /api/test/wompi-signature?reference=TEST&amount=100000&currency=COP
 *
 * Returns the generated signature and the input string (with secret masked).
 * This helps verify that the signature matches what Wompi expects.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development mode' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference') || 'TEST-REF-001';
  const amount = parseInt(searchParams.get('amount') || '100000', 10);
  const currency = searchParams.get('currency') || 'COP';

  const secret = process.env.WOMPI_INTEGRITY_SECRET || '';
  const concatenated = `${reference}${amount}${currency}${secret}`;
  const hash = createHash('sha256').update(concatenated).digest('hex');

  return NextResponse.json({
    input: {
      reference,
      amountInCents: amount,
      currency,
      secretSource: 'WOMPI_INTEGRITY_SECRET',
      secretLength: secret.length,
      secretPrefix: secret.substring(0, 14) + '...',
      concatenatedPreview: `${reference}${amount}${currency}${'***SECRET***'}`,
    },
    signature: hash,
    envVars: {
      WOMPI_ENV: process.env.WOMPI_ENV || 'not set',
      hasWOMPI_INTEGRITY_SECRET: !!process.env.WOMPI_INTEGRITY_SECRET,
      hasNEXT_PUBLIC_WOMPI_INTEGRITY_SECRET: !!process.env.NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET,
      NEXT_PUBLIC_WOMPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || 'not set',
    },
  });
}
