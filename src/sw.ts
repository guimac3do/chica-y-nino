// public/sw.js
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  console.log('Fetch interceptado:', url.pathname, event.request.method);

  if (url.pathname === '/_share-target' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const mediaFiles = formData.getAll('images');

        console.log('FormData completo:', [...formData.entries()]);
        console.log('Arquivos recebidos no service worker:', mediaFiles.length, mediaFiles.map(f => f.name));

        if (mediaFiles.length > 0) {
          const newFormData = new FormData();
          mediaFiles.forEach((file) => {
            newFormData.append('images[]', file);
          });

          const response = await fetch('https://localhost:8002/api/cadastro-produto', {
            method: 'POST',
            body: newFormData,
          });

          const redirectUrl = await response.text();
          console.log('Redirecionando para:', redirectUrl);
          return Response.redirect(redirectUrl, 303);
        }

        console.log('Nenhum arquivo recebido no service worker');
        return new Response('Nenhum arquivo recebido', { status: 400 });
      })()
    );
  }
});