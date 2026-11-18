import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Registra o service worker (PWA) para o app funcionar offline.
//
// Só registra em contexto web (http/https). No app instalado em Electron a
// pagina e carregada por file:// e nao existe service worker — o Electron ja
// garante que os arquivos estao no disco.
const isElectron = Boolean((window as any).electronAPI?.isElectron);
const isWeb = location.protocol === 'http:' || location.protocol === 'https:';

if (isWeb && !isElectron && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[pwa] nao foi possivel registrar o service worker:', err);
    });
  });
}
