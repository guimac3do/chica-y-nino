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

          let response;
          try {
            response = await fetch('https://localhost:8002/api/admin/share-target', {
              method: 'POST',
              body: newFormData,
            });
            console.log('Resposta do fetch:', response.status, response.statusText);
          } catch (error) {
            console.error('Erro no fetch:', error);
            return new Response('Erro ao enviar imagens ao servidor', { status: 500 });
          }

          const redirectUrl = await response.text();
          console.log('Redirecionando para:', redirectUrl);

          // Usa clients.openWindow para navegar
          await self.clients.openWindow(redirectUrl);

          return new Response('Imagens processadas com sucesso', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          });
        }

        console.log('Nenhum arquivo recebido no service worker');
        return new Response('Nenhum arquivo recebido', { status: 400 });
      })()
    );
  }
});