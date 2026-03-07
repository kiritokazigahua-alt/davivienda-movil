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
      const res = await fetch('/api/my/support-phone', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.value) {
          setSupportPhone(data.value);
          return;
        }
      }
    } catch {}
    try {
      const res = await fetch('/api/settings/support_phone', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.value) setSupportPhone(data.value);
      }
    } catch {}
  }, [userOverride]);

  useEffect(() => {
    fetchPhone();
    const interval = setInterval(fetchPhone, 15000);
    return () => clearInterval(interval);
  }, [fetchPhone]);

  const openWhatsApp = (message?: string) => {
    const text = message || "Hola, necesito ayuda con mi cuenta Davivienda";
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

  const fetchPhone = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/support_phone', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.value) setSupportPhone(data.value);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchPhone();
    const interval = setInterval(fetchPhone, 15000);
    return () => clearInterval(interval);
  }, [fetchPhone]);

  const openWhatsApp = (message?: string) => {
    const text = message || "Hola, necesito ayuda con mi cuenta Davivienda";
    const clean = supportPhone.replace(/\s/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const callSupport = () => {
    window.location.href = `tel:${supportPhone.replace(/\s/g, '')}`;
  };

  return { supportPhone, openWhatsApp, callSupport, refetch: fetchPhone };
}
