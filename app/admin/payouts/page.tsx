import { getPendingPayouts } from '@/lib/actions/admin/payouts';
import { PayoutsClient } from './client';

export const dynamic = 'force-dynamic';

export default async function PayoutsPage() {
  const payouts = await getPendingPayouts();
  return <PayoutsClient payouts={payouts} />;
}
