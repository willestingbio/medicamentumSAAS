import { describe, it, expect } from 'vitest';
import { validateWompiSignature, generateOrderReference } from '@/lib/wompi';
import crypto from 'crypto';

describe('Wompi HMAC Signature Validation', () => {
  const secretKey = 'test_secret_key_123';

  it('validates a correct HMAC signature', () => {
    const payload = JSON.stringify({ event: 'transaction.updated', transaction: { id: '123' } });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = timestamp + payload;
    const signature = crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
    const header = `tsv1=${timestamp},v1=${signature}`;

    expect(validateWompiSignature(payload, header, secretKey)).toBe(true);
  });

  it('rejects an incorrect HMAC signature', () => {
    const payload = JSON.stringify({ event: 'transaction.updated' });
    const header = 'tsv1=12345,v1=invalid_signature_hex';

    expect(validateWompiSignature(payload, header, secretKey)).toBe(false);
  });

  it('rejects a malformed header', () => {
    const payload = '{}';
    expect(validateWompiSignature(payload, 'malformed', secretKey)).toBe(false);
    expect(validateWompiSignature(payload, '', secretKey)).toBe(false);
  });
});

describe('Order Reference Generation', () => {
  it('generates a unique reference with M360 prefix', () => {
    const ref1 = generateOrderReference('abc12345');
    const ref2 = generateOrderReference('abc12345');

    expect(ref1).toMatch(/^M360-ABC12345-/);
    expect(ref2).toMatch(/^M360-ABC12345-/);
    // Timestamps and random part make them unique
    expect(ref1).not.toBe(ref2);
  });

  it('reference is uppercase', () => {
    const ref = generateOrderReference('test1234');
    expect(ref).toBe(ref.toUpperCase());
  });
});

describe('Webhook HMAC Integration', () => {
  const eventsSecret = 'webhook_test_secret';

  it('simulates webhook HMAC validation end-to-end', () => {
    const webhookPayload = JSON.stringify({
      event: 'transaction.updated',
      transaction: {
        id: 'txn_abc123',
        status: 'APPROVED',
        reference: 'M360-ORDER01-test-abc',
        amount_in_cents: 50000,
        currency: 'COP',
      },
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = timestamp + webhookPayload;
    const signature = crypto.createHmac('sha256', eventsSecret).update(stringToSign).digest('hex');
    const header = `tsv1=${timestamp},v1=${signature}`;

    expect(validateWompiSignature(webhookPayload, header, eventsSecret)).toBe(true);
  });

  it('rejects webhook with wrong secret', () => {
    const payload = JSON.stringify({ event: 'transaction.updated' });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = timestamp + payload;
    const signature = crypto.createHmac('sha256', eventsSecret).update(stringToSign).digest('hex');
    const header = `tsv1=${timestamp},v1=${signature}`;

    expect(validateWompiSignature(payload, header, 'wrong_secret')).toBe(false);
  });
});
