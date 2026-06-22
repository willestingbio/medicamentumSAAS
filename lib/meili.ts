import { Meilisearch } from 'meilisearch';

const MEILI_HOST = process.env.MEILI_HOST || 'http://localhost:7700';
const MEILI_API_KEY = process.env.MEILI_API_KEY || '';

let client: Meilisearch | null = null;

export function getMeiliClient(): Meilisearch {
  if (!client) {
    client = new Meilisearch({
      host: MEILI_HOST,
      apiKey: MEILI_API_KEY || undefined,
    });
  }
  return client;
}

export async function searchProducts(query: string, params?: {
  type?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const meili = getMeiliClient();
    const index = meili.index('products');

    const filter = params?.type && params.type !== 'all'
      ? [`type = "${params.type}"`]
      : undefined;

    const result = await index.search(query, {
      filter,
      limit: params?.limit || 12,
      offset: params?.offset || 0,
      attributesToHighlight: ['title', 'description'],
      attributesToCrop: ['description'],
    });

    return {
      hits: result.hits,
      estimatedTotalHits: result.estimatedTotalHits,
      processingTimeMs: result.processingTimeMs,
    };
  } catch {
    // Meilisearch not available — fallback to DB search
    return null;
  }
}

export async function indexProduct(product: {
  id: string;
  type: string;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  discountCents: number | null;
  capacity: number | null;
  published: boolean;
}) {
  try {
    const meili = getMeiliClient();
    const index = meili.index('products');
    await index.addDocuments([product]);
  } catch {
    // Meilisearch not available — silent fail
  }
}
