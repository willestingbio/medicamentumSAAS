import { getReviewQueue, getVendorsPendingReview } from '@/lib/actions/admin/review-queue';
import { ReviewQueueClient } from './client';

export const dynamic = 'force-dynamic';

export default async function ReviewQueuePage() {
  const [products, vendors] = await Promise.all([
    getReviewQueue(),
    getVendorsPendingReview(),
  ]);

  return <ReviewQueueClient products={products} vendors={vendors} />;
}
