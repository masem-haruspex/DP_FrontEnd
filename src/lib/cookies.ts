// lib/cookies.ts
export const setCookie = (name: string, value: string, days?: number) => {
  let expires = '';
  let secureFlag = '';

  if (import.meta.env.PROD) {
    secureFlag = '; Secure';
  }

  if (days !== undefined) {
    if (days > 0) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = `; expires=${date.toUTCString()}`;
    } else if (days === 0) {
      expires = '';
    }
  }

  document.cookie = `${name}=${value}${expires}${secureFlag}; path=/; SameSite=Strict`;
};

export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(';').shift()!;
  return null;
};

export const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

export const generateGuestId = (): string => {
  return crypto.randomUUID();
};

export const getOrCreateGuestId = (): string => {
  let guestId = getCookie('guest_id');
  if (!guestId) {
    guestId = generateGuestId();
    setCookie('guest_id', guestId, 365);
  }
  return guestId;
};
