import TrafficLightsClient from './TrafficLightsClient';

export const metadata = {
  title: 'Traffic Lights - Training Performance Hub',
  description: 'Manage and monitor employee traffic light statuses',
};

export default function TrafficLightsPage() {
  return (
    <div className="flex-1 w-full p-4 lg:p-8 xl:p-12 overflow-y-auto">
      <TrafficLightsClient />
    </div>
  );
}
