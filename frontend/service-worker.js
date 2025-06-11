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
                try {
                    const formData = await event.request.formData();
                    const mediaFiles = formData.getAll('images');

                    console.log('Arquivos recebidos no service worker:', mediaFiles.length, mediaFiles.map(f => f.name));

                    if (mediaFiles.length > 0) {
                        const newFormData = new FormData();
                        mediaFiles.forEach((file) => {
                            newFormData.append('images[]', file);
                        });

                        // 📌 Envia os arquivos para o Laravel
                        const response = await fetch('http://localhost:8002/api/admin/share-target', {
                            method: 'POST',
                            body: newFormData,
                        });

                        const redirectUrl = await response.text();
                        console.log('Redirecionando para:', redirectUrl);

                        // 📌 Aguarda a aba do PWA estar aberta e então redireciona
                        const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
                        if (allClients.length > 0) {
                            allClients[0].postMessage({ action: 'redirect', url: redirectUrl });
                        } else {
                            self.clients.openWindow(redirectUrl);
                        }

                        return new Response('', { status: 200 });
                    }

                    console.log('Nenhum arquivo recebido no service worker');
                    return new Response('Nenhum arquivo recebido', { status: 400 });
                } catch (error) {
                    console.error('Erro no Service Worker:', error);
                    return new Response('Erro ao processar compartilhamento', { status: 500 });
                }
            })()
        );
    }
});

