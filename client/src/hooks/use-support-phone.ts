import { useState, useEffect, useCallback } from 'react';

export const DEFAULT_SUPPORT_PHONE = "+573208646620";

export function useSupportPhone(userOverride?: string | null) {
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_PHONE);

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
    fetchPhone();
    const interval = setInterval(fetchPhone, 30000);
    return () => clearInterval(interval);
  }, [fetchPhone]);

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

  useEffect(() => {
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
    const interval = setInterval(fetchPhone, 30000);
    return () => clearInterval(interval);
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
