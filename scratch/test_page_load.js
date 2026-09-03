const { getDashboardData } = require('../lib/data-fetcher');

async function test() {
  const data = await getDashboardData();
  console.log('GET DASHBOARD DATA SUCCESS:');
  console.log('Metrics:', data.metrics);
  console.log('Account count:', data.allAccounts?.length);
  console.log('Inhouse groups count:', Object.keys(data.inhouse?.groups || {}).length);
  console.log('PST groups count:', Object.keys(data.pst?.groups || {}).length);
}

test().catch(console.error);
