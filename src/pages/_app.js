import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { CartProvider } from '../context/CartContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import '../lib/auth';
import '../styles/mobile.css';
import '../styles/desktop.css';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const token = (typeof window !== 'undefined') ? (localStorage.getItem('token') || (document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] && decodeURIComponent(document.cookie.match(/(?:^|; )token=([^;]+)/)[1]))) : '';
      if (!token) { setIsAdmin(false); return; }
      const payload = JSON.parse(atob((token.split('.')[1]||'e30=')));
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const isAdm = !!adminEmail && payload?.email === adminEmail;
      setIsAdmin(isAdm);
      // If admin and not on dashboard, force redirect to dashboard
      if (isAdm && typeof window !== 'undefined') {
        const path = router.pathname || '';
        if (!path.startsWith('/dashboard')) router.replace('/dashboard');
      }
    } catch { setIsAdmin(false); }
  }, [router.pathname]);

  return (
    <CartProvider>
      {!(isAdmin || (router.pathname||'').startsWith('/dashboard')) && <NavBar />}
      <Component {...pageProps} />
      {!(isAdmin || (router.pathname||'').startsWith('/dashboard')) && <Footer />}
    </CartProvider>
  );
}
