import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ShareTargetPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'navigate' && event.data.url) {
        console.log('Mensagem recebida no ShareTargetPage:', event.data.url);
        const relativeUrl = event.data.url.replace(window.location.origin, '');
        navigate(relativeUrl);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    navigator.serviceWorker.ready.then((registration) => {
      console.log('Solicitando URL de redirecionamento');
      registration.active?.postMessage({ type: 'get-redirect-url' });
    });

    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecionando para o cadastro de produto...</p>
    </div>
  );
};

export default ShareTargetPage;