// public/sw.js
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('Service Worker ativado com sucesso.');
});

// O navegador exige que tenha um evento 'fetch' para considerar como PWA válido
self.addEventListener('fetch', (e) => {
  // Mantemos vazio para não interferir nas chamadas do Next.js
});