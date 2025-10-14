import axios from 'axios';

// Base automática:
// 1) Usa NEXT_PUBLIC_API_URL ou NEXT_PUBLIC_API_BASE, se definido
// 2) No browser, se não houver env, aponta para http://<host>:8000/api (acesso via LAN)
// 3) No Node (SSR/dev tools), usa http://127.0.0.1:8000/api
function computeBase(){
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined'){
    const port = String(window.location.port || '');
    // Em dev (rodando via Next com alguma porta), prefira o proxy '/api'
    // Isso permite acessar do celular sem expor a porta 8000 na LAN.
    if (port) return '/api';
    const host = window.location.hostname; // fallback
    const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${proto}//${host}:8000/api`;
  }
  return 'http://127.0.0.1:8000/api';
}

const api = axios.create({ baseURL: computeBase() });

// Fallback automático: se falhar com Network Error usando '/api' (proxy Next),
// tenta uma segunda vez direto em http://<host>:8000/api
let triedFallback = false;
api.interceptors.response.use(
  r => r,
  async (error) => {
    const isNetwork = error && (error.code === 'ERR_NETWORK' || /Network Error/i.test(String(error.message||'')));
    const inBrowser = typeof window !== 'undefined';
    const usingProxy = inBrowser && String(window.location.port||'') === '3000' && api.defaults.baseURL === '/api';
    if (isNetwork && inBrowser && usingProxy && !triedFallback) {
      triedFallback = true;
      const host = window.location.hostname;
      const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
      api.defaults.baseURL = `${proto}//${host}:8000/api`;
      // Reenvia a requisição com nova base
      const cfg = { ...error.config, baseURL: api.defaults.baseURL };
      return api.request(cfg);
    }
    throw error;
  }
);

export default api;
