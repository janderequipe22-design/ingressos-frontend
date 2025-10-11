import api from './api';

function readCookie(name){
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )'+name.replace(/([.$?*|{}()\[\]\\\/\+^])/g,'\\$1')+'=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name, value, opts={}){
  if (typeof document === 'undefined') return;
  const { days=7, path='/' } = opts;
  const expires = new Date(Date.now()+days*24*60*60*1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=${path}; Expires=${expires}; SameSite=Lax`;
}

function deleteCookie(name){
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  // Prefer cookie (shared across ports on localhost)
  const fromCookie = readCookie('token');
  if (fromCookie) return fromCookie;
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  writeCookie('token', token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  deleteCookie('token');
}

// Attach token to axios on runtime
if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const t = getToken();
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
  });
}
