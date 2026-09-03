import TrafficLightsClient from './TrafficLightsClient';
import { getAvailableTrafficLightAccounts } from '@/lib/actions/traffic-lights';

export const metadata = {
  title: 'Traffic Lights - Training Performance Hub',
  description: 'Manage and monitor employee traffic light statuses',
};

export default async function TrafficLightsPage() {
  const dynamicAccounts = await getAvailableTrafficLightAccounts();

  return (
    <div className="flex-1 w-full px-1 py-3 sm:px-2 overflow-y-auto">
      <TrafficLightsClient initialAccounts={dynamicAccounts} />
    </div>
  );
}
