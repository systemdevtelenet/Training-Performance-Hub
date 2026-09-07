import { getTrafficLightData } from '../lib/actions/traffic-lights';

async function check() {
  const { data, error } = await getTrafficLightData('trainers', 'q2');
  console.log('Trainers q2 count:', data?.length, 'error:', error);
  if (data && data.length > 0) {
    console.log('Keys of row 0:', Object.keys(data[0]));
    console.log('Row 0:', data[0]);
    console.log('Row 1:', data[1]);
  }
}
check();
