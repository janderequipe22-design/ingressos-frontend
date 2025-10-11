import axios from 'axios';

// In produção, use NEXT_PUBLIC_API_URL (ex.: https://api.seudominio.com.br)
// Em dev, mantemos '/api' para usar o proxy de rewrites do Next.js
const baseURL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || '/api')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');

const api = axios.create({ baseURL });

export default api;
