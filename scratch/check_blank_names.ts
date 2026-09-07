import { getTrafficLightData } from '../lib/actions/traffic-lights';

async function check() {
  const accounts = ['awd', 'other_acc', 'rm', 'xpn', 'leaders', 'dft'];
  for (const acc of accounts) {
    const { data, error } = await getTrafficLightData(acc, 'q2');
    if (data && data.length > 0) {
      console.log(`=== ACCOUNT: ${acc} (${data.length} rows) ===`);
      data.forEach((row, i) => {
        const keys = Object.keys(row);
        const nameCol = keys.find(k => ['teams', 'name', 'trainers', 'trainer', 'employee', 'staff'].includes(k.toLowerCase()))
          || keys.find(k => !['id', 'created_at', 'account', 'position'].includes(k.toLowerCase()))
          || keys[0];
        const val = row[nameCol];
        if (!val || String(val).trim() === '' || String(val).trim() === 'null' || String(val).trim() === 'undefined') {
          console.log(`Row ${i} HAS BLANK/NULL NAME:`, row);
        } else {
          console.log(`Row ${i} [${nameCol}]: "${val}"`);
        }
      });
    }
  }
}
check();
