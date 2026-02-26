import { useState, useEffect } from 'react';

export const DEFAULT_SUPPORT_PHONE = "+573209233903";

export function useSupportPhone(userOverride?: string | null) {
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_PHONE);

  useEffect(() => {
    if (userOverride) {
      setSupportPhone(userOverride);
      return;
    }
    const fetchPhone = async () => {
      try {
        const res = await fetch('/api/settings/support_phone');
        if (res.ok) {
          const data = await res.json();
          if (data.value) setSupportPhone(data.value);
        }
      } catch {
        // keep default
      }
    };
    fetchPhone();
  }, [userOverride]);

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
