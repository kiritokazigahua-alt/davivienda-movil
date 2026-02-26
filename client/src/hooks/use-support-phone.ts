import { useState, useEffect, useCallback, useRef } from 'react';

export const DEFAULT_SUPPORT_PHONE = "+573208646620";

function usePageVisible() {
  const [visible, setVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
  return visible;
}

export function useSupportPhone(userOverride?: string | null) {
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_PHONE);
  const isVisible = usePageVisible();
  const fetchedRef = useRef(false);

  const fetchPhone = useCallback(async () => {
    if (userOverride) {
      setSupportPhone(userOverride);
      return;
    }
    try {
      const res = await fetch('/api/my/support-phone');
      if (res.ok) {
        const data = await res.json();
        if (data.value) {
          setSupportPhone(data.value);
          return;
        }
      }
    } catch {}
    try {
      const res = await fetch('/api/settings/support_phone');
      if (res.ok) {
        const data = await res.json();
        if (data.value) setSupportPhone(data.value);
      }
    } catch {}
  }, [userOverride]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchPhone();
      fetchedRef.current = true;
    }
  }, [fetchPhone]);

  useEffect(() => {
    if (!isVisible) return;
    fetchPhone();
    const interval = setInterval(fetchPhone, 120000);
    return () => clearInterval(interval);
  }, [isVisible, fetchPhone]);

  const openWhatsApp = (message?: string) => {
    const text = message || "Hola, necesito ayuda con mi cuenta. Tengo un error #4004";
    const clean = supportPhone.replace(/\s/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const callSupport = () => {
    window.location.href = `tel:${supportPhone.replace(/\s/g, '')}`;
  };

  return { supportPhone, openWhatsApp, callSupport, refetch: fetchPhone };
}

export function usePublicSupportPhone() {
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_PHONE);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const fetchPhone = async () => {
      try {
        const res = await fetch('/api/settings/support_phone');
        if (res.ok) {
          const data = await res.json();
          if (data.value) setSupportPhone(data.value);
        }
      } catch {}
    };
    fetchPhone();
  }, []);

  const openWhatsApp = (message?: string) => {
    const text = message || "Hola, necesito ayuda con mi cuenta. Tengo un error #4004";
    const clean = supportPhone.replace(/\s/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const callSupport = () => {
    window.location.href = `tel:${supportPhone.replace(/\s/g, '')}`;
  };

  return { supportPhone, openWhatsApp, callSupport };
}
