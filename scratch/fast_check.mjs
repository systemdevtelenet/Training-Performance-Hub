const url = 'https://zhdmsmwrskxowvytedgh.supabase.co/rest/v1/trainers_profile?select=*&limit=1';

const headers = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZG1zbXdyc2t4b3d2eXRlZGdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzgzODcwMSwiZXhwIjoyMTAzNDE0NzAxfQ.z-hRrS7CquzpIfBzeirF2OncUKJmsRFzmngtVVsZrso',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZG1zbXdyc2t4b3d2eXRlZGdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzgzODcwMSwiZXhwIjoyMTAzNDE0NzAxfQ.z-hRrS7CquzpIfBzeirF2OncUKJmsRFzmngtVVsZrso'
};

fetch(url, { headers })
  .then(res => res.json())
  .then(data => {
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
      console.log('Data:', data[0]);
    } else {
      console.log('No data returned.');
    }
  })
  .catch(err => console.error(err));
