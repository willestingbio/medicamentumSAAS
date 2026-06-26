/**
 * Wompi Payment Gateway Client
 * Direct fetch integration — no SDK dependency
 *
 * Docs: https://docs.wompi.co/
 *
 * Environment setup:
 * - WOMPI_ENV=sandbox  → uses sandbox.wompi.co (test transactions)
 * - WOMPI_ENV=production → uses production.wompi.co (real transactions)
 *
 * Widget URL is the same for both: https://checkout.wompi.co/widget.js
 * The difference is in the API keys (pub_test_ vs pub_prod_)
 */

const WOMPI_SANDBOX_URL = 'https://sandbox.wompi.co/v1';
const WOMPI_PRODUCTION_URL = 'https://production.wompi.co/v1';

// ===== Types =====
export interface WompiTransaction {
  id: string;
  amount_in_cents: number;
  currency: string;
  reference: string;
  customer_email: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
  payment_method_type: 'CARD' | 'PSE' | 'NEQUI' | 'BANCOLOMBIA_COLLECT' | 'CASH';
  payment_method: {
    type: string;
    card?: {
      card_type: string;
      last_four: string;
      brand: string;
      installments: number;
    };
    pse?: {
      user_type: string;
      user_legal_id_type: string;
      user_legal_id: string;
      bank_name: string;
    };
  };
  transaction_created_at: number;
  transaction_finalized_at: number | null;
}

export interface WompiTokenizedCard {
  id: string;
  type: string;
  brand: string;
  last_four: string;
  exp_month: string;
  exp_year: string;
}

export interface WompiPaymentIntent {
  amount_in_cents: number;
  currency: string;
  reference: string;
  customer_email: string;
  payment_method: {
    type: 'CARD';
    token: string;
    installments: number;
  };
}

// ===== HMAC Signature Validation =====
export function validateWompiSignature(
  payload: string,
  signatureHeader: string,
  secretKey: string
): boolean {
  // Parse the signature header: "tsv1=<timestamp>,v1=<hmac-sha256>"
  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts['tsv1'];
  const signature = parts['v1'];

  if (!timestamp || !signature) {
    return false;
  }

  // Create the string to sign: timestamp + payload
  const stringToSign = timestamp + payload;

  // Compute HMAC-SHA256
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(stringToSign)
    .digest('hex');

  // Use constant-time comparison to prevent timing side-channel attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

// ===== API Client =====
export class WompiClient {
  private privateKey: string;
  private eventsSecret: string;
  private baseUrl: string;

  constructor() {
    this.privateKey = process.env.WOMPI_PRIVATE_KEY!;
    this.eventsSecret = process.env.WOMPI_EVENTS_SECRET!;
    this.baseUrl = process.env.WOMPI_ENV === 'production'
      ? WOMPI_PRODUCTION_URL
      : WOMPI_SANDBOX_URL;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.privateKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Wompi API error: ${response.status} ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Get acceptance tokens (required before creating a transaction)
   */
  async getAcceptanceTokens(): Promise<{
    presigned_acceptance: { acceptance_token: string; permalink: string };
    presigned_personal_data_auth: { acceptance_token: string; permalink: string };
  }> {
    return this.request('/merchants/get_presigned_acceptance');
  }

  /**
   * Tokenize a card (client-side, but we expose the endpoint for reference)
   * NOTE: In production, card tokenization happens client-side via Wompi's widget
   */
  async tokenizeCard(card: {
    number: string;
    cvc: string;
    exp_month: string;
    exp_year: string;
    card_holder: string;
  }): Promise<WompiTokenizedCard> {
    // Card tokenization is done client-side in production
    // This is here for testing purposes only
    const response = await fetch('https://sandbox.wompi.co/v1/tokens/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Card tokenization failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Create a payment intent (server-side)
   */
  async createTransaction(params: {
    amountInCents: number;
    currency: string;
    reference: string;
    customerEmail: string;
    acceptanceToken: string;
    personalDataToken: string;
    cardToken: string;
    installments: number;
  }): Promise<WompiTransaction> {
    const transactionData = {
      amount_in_cents: params.amountInCents,
      currency: params.currency,
      reference: params.reference,
      customer_email: params.customerEmail,
      acceptance_token: params.acceptanceToken,
      personal_data_acceptance_token: params.personalDataToken,
      payment_method: {
        type: 'CARD',
        token: params.cardToken,
        installments: params.installments,
      },
    };

    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  /**
   * Get transaction status by ID
   */
  async getTransaction(transactionId: string): Promise<WompiTransaction> {
    return this.request(`/transactions/${transactionId}`);
  }

  /**
   * Get transaction by reference
   */
  async getTransactionByReference(reference: string): Promise<WompiTransaction> {
    return this.request(`/transactions?reference=${reference}`);
  }

  /**
   * Validate webhook event signature
   */
  validateWebhookSignature(payload: string, signatureHeader: string): boolean {
    return validateWompiSignature(payload, signatureHeader, this.eventsSecret);
  }
}

// ===== Singleton =====
let wompiClient: WompiClient | null = null;

export function getWompiClient(): WompiClient {
  if (!wompiClient) {
    wompiClient = new WompiClient();
  }
  return wompiClient;
}

// ===== Environment Info =====
export function getWompiEnvironment() {
  const env = process.env.WOMPI_ENV || 'sandbox';
  return {
    env: env as 'sandbox' | 'production',
    apiUrl: env === 'production' ? WOMPI_PRODUCTION_URL : WOMPI_SANDBOX_URL,
    widgetUrl: 'https://checkout.wompi.co/widget.js',
    isProduction: env === 'production',
  };
}

// ===== Helper: Generate unique reference =====
export function generateOrderReference(orderId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `M360-${orderId.slice(-8).toUpperCase()}-${timestamp}-${random}`.toUpperCase();
}
