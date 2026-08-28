const url = 'https://zhdmsmwrskxowvytedgh.supabase.co/rest/v1/?apikey=' + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZG1zbXdyc2t4b3d2eXRlZGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg3MDEsImV4cCI6MjEwMzQxNDcwMX0.jEfT-8dwK1tp3fuQW9ypTObVNc0a6EjgvfgKJhzg70o';

fetch(url)
  .then(res => res.json())
  .then(data => console.log('Tables:', data.definitions ? Object.keys(data.definitions) : data))
  .catch(err => console.error(err));
