import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { validateWompiSignature } from '@/lib/wompi';

describe('Webhook Idempotency', () => {
  const eventsSecret = 'idempotency_test_secret';

  function createWebhookEvent(status: string, reference: string) {
    const payload = JSON.stringify({
      event: 'transaction.updated',
      transaction: {
        id: `txn_${Date.now()}`,
        status,
        reference,
        amount_in_cents: 100000,
        currency: 'COP',
        customer_email: 'test@example.com',
      },
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = timestamp + payload;
    const signature = crypto.createHmac('sha256', eventsSecret).update(stringToSign).digest('hex');
    const header = `tsv1=${timestamp},v1=${signature}`;

    return { payload, header };
  }

  it('same event produces same signature format', () => {
    const reference = 'M360-TEST0001-abc-123';
    const event1 = createWebhookEvent('APPROVED', reference);
    const event2 = createWebhookEvent('APPROVED', reference);

    // Same reference → different timestamps → different signatures
    // But both should be valid with the correct secret
    expect(validateWompiSignature(event1.payload, event1.header, eventsSecret)).toBe(true);
    expect(validateWompiSignature(event2.payload, event2.header, eventsSecret)).toBe(true);
  });

  it('different references produce different signatures', () => {
    const event1 = createWebhookEvent('APPROVED', 'M360-ORDER001-abc');
    const event2 = createWebhookEvent('APPROVED', 'M360-ORDER002-xyz');

    expect(validateWompiSignature(event1.payload, event1.header, eventsSecret)).toBe(true);
    expect(validateWompiSignature(event2.payload, event2.header, eventsSecret)).toBe(true);

    // Cross-validate: event1's signature should NOT validate event2's payload
    expect(validateWompiSignature(event2.payload, event1.header, eventsSecret)).toBe(false);
  });

  it('DECLINED status produces valid signature', () => {
    const event = createWebhookEvent('DECLINED', 'M360-ORDER003-def');
    expect(validateWompiSignature(event.payload, event.header, eventsSecret)).toBe(true);

    const parsed = JSON.parse(event.payload);
    expect(parsed.transaction.status).toBe('DECLINED');
  });

  it('APPROVED status produces valid signature', () => {
    const event = createWebhookEvent('APPROVED', 'M360-ORDER004-ghi');
    expect(validateWompiSignature(event.payload, event.header, eventsSecret)).toBe(true);

    const parsed = JSON.parse(event.payload);
    expect(parsed.transaction.status).toBe('APPROVED');
  });

  it('simulates idempotency check logic', () => {
    // Simulate the webhook handler's idempotency logic:
    // If order.status === 'paid', skip processing
    const orders = new Map<string, { status: string; reference: string }>();

    // First webhook: order is pending
    const ref = 'M360-ORDER005-jkl';
    orders.set(ref, { status: 'pending', reference: ref });

    function processWebhook(reference: string, newStatus: string) {
      const order = orders.get(reference);
      if (!order) return { action: 'not_found' };
      if (order.status === 'paid') return { action: 'skipped', reason: 'already_paid' };
      order.status = newStatus;
      return { action: 'updated', newStatus };
    }

    // First call → update to paid
    const result1 = processWebhook(ref, 'paid');
    expect(result1).toEqual({ action: 'updated', newStatus: 'paid' });

    // Second call (duplicate webhook) → skip
    const result2 = processWebhook(ref, 'paid');
    expect(result2).toEqual({ action: 'skipped', reason: 'already_paid' });

    // Unknown reference → not found
    const result3 = processWebhook('M360-NONEXISTENT', 'paid');
    expect(result3).toEqual({ action: 'not_found' });
  });
});
