const https = require('https');
const fs = require('fs');
const path = require('path');

const logoUrl = 'https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/ctnp-logo.png';

https.get(logoUrl, (res) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64}`;

    // Create self-contained SVG with embedded base64 image and white circular background
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="49" fill="#FFFFFF"/>
  <circle cx="50" cy="50" r="48" fill="none" stroke="#E2E8F0" stroke-width="2"/>
  <image href="${dataUri}" x="10" y="10" width="80" height="80" preserveAspectRatio="xMidYMid meet"/>
</svg>`;

    const publicDir = path.join(__dirname, '..', 'public');
    fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
    console.log('Successfully generated public/favicon.svg with embedded base64 data URI');
  });
}).on('error', (err) => {
  console.error('Error fetching image:', err);
});
