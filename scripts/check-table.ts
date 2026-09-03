import { getTrafficLightData } from '../lib/actions/traffic-lights';

async function check() {
  const { data, error } = await getTrafficLightData('fleet', 'q2');
  console.log('getTrafficLightData fleet q2 result count:', data?.length, 'error:', error);
  if (data && data.length > 0) {
    console.log('First employee:', data[0].teams);
  }
}
check();
