import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Cloudflare Stream Webhook — POST /api/webhooks/cloudflare-stream
 *
 * Receives encoding status updates from Cloudflare Stream.
 * Publicly documented at: https://developers.cloudflare.com/stream/manage-video-lifecycle/using-webhooks/
 *
 * Payload shape:
 * {
 *   uid: string,         // The Cloudflare Stream video UID (matches streamVideoId)
 *   status: {
 *     state: 'ready' | 'error' | 'queued' | 'inprogress',
 *     errorReasonText?: string,
 *     pctComplete?: string
 *   },
 *   duration?: number    // Duration in seconds (present when state === 'ready')
 * }
 *
 * Security: Webhook signature verification (CF-Webhook-Signature) is pending.
 * In production, validate the HMAC signature before processing any payload.
 */

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { uid, status, duration } = payload;

    if (!uid || !status) {
      return NextResponse.json(
        { error: 'Invalid payload: uid and status are required' },
        { status: 400 }
      );
    }

    // TODO: Validate CF-Webhook-Signature header when webhook secret is configured
    // const signature = req.headers.get('CF-Webhook-Signature') || '';
    // const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
    // if (!validateCloudflareSignature(rawBody, signature, secret)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const state = status.state;

    if (state === 'ready') {
      const durationSec = typeof duration === 'number' ? Math.round(duration) : null;

      const lesson = await prisma.lesson.findFirst({
        where: { streamVideoId: uid },
        select: { id: true, title: true },
      });

      if (!lesson) {
        console.warn(
          `[Cloudflare Stream Webhook] No lesson found for streamVideoId: ${uid}`
        );
        return NextResponse.json({ received: true });
      }

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { videoDurationSec: durationSec },
      });

      console.log(
        `[Cloudflare Stream Webhook] Video ready — lesson "${lesson.title}" (${lesson.id}), duration: ${durationSec}s`
      );
    } else if (state === 'error') {
      const errorText = status.errorReasonText || 'Unknown error';

      console.error(
        `[Cloudflare Stream Webhook] Encoding error for video ${uid}: ${errorText}`
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Cloudflare Stream Webhook] Error processing webhook:', error);
    return NextResponse.json({ received: true });
  }
}
