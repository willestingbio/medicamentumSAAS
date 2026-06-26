import { sign } from 'jsonwebtoken';

const ACCOUNT_ID = process.env.CLOUDFLARE_STREAM_ACCOUNT_ID!;
const API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN!;
const CF_API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`;

type VideoState =
  | "pendingupload"
  | "downloading"
  | "queued"
  | "inprogress"
  | "ready"
  | "error";

interface DirectUploadResult {
  uploadURL: string;
  uid: string;
}

export async function createDirectUploadUrl(
  maxDurationSeconds = 3600,
): Promise<DirectUploadResult> {
  const allowedOriginHostname = process.env.BETTER_AUTH_URL
    ? new URL(process.env.BETTER_AUTH_URL).hostname
    : "localhost";

  const res = await fetch(`${CF_API}/direct_upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs: true,
      allowedOrigins: [allowedOriginHostname],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Cloudflare Stream direct_upload error ${res.status}: ${body}`,
    );
  }

  const { result } = await res.json();
  return result as DirectUploadResult;
}

export async function deleteStreamVideo(uid: string): Promise<void> {
  const res = await fetch(`${CF_API}/${uid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });

  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(
      `Cloudflare Stream delete error ${res.status}: ${body}`,
    );
  }
}

export async function getVideoStatus(uid: string): Promise<VideoState> {
  const res = await fetch(`${CF_API}/${uid}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Cloudflare Stream get status error ${res.status}: ${body}`,
    );
  }

  const { result } = await res.json();
  return result.status?.state as VideoState;
}

export function getSignedPlaybackUrl(
  streamVideoId: string,
  expiresInSeconds = 3600,
): string {
  const baseUrl = `https://customer-${ACCOUNT_ID}.cloudflarestream.com/${streamVideoId}/manifest/video.m3u8`;

  const signingKeyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
  const signingKeyPem = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_PEM;

  if (!signingKeyId || !signingKeyPem) {
    return baseUrl;
  }

  const token = sign(
    { sub: streamVideoId },
    signingKeyPem,
    {
      algorithm: "RS256",
      expiresIn: expiresInSeconds,
      keyid: signingKeyId,
    },
  );

  return `${baseUrl}?token=${token}`;
}
