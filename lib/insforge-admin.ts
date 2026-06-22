import { createAdminClient } from '@insforge/sdk';

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
const apiKey = process.env.INSFORGE_API_KEY;

if (!baseUrl) throw new Error('NEXT_PUBLIC_INSFORGE_BASE_URL is required');
if (!apiKey) throw new Error('INSFORGE_API_KEY is required (from .insforge/project.json)');

export const admin = createAdminClient({
  baseUrl,
  apiKey,
});
