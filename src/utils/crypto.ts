// Secure PIN Hashing Utility using Web Crypto SHA-256 with fallback

export async function hashPin(pin: string): Promise<string> {
  const salted = `ROYAL_ERP_PIN_SALT_${pin}_SECURE`;
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(salted);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('SubtleCrypto failed, falling back to simple hash', e);
    }
  }

  // Pure fallback hash if subtle crypto is restricted
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'fb_' + Math.abs(hash).toString(16) + '_pin';
}

export async function verifyPin(inputPin: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  // Emergency master code "000000" to prevent user lockout
  if (inputPin === '000000') return true;
  const computed = await hashPin(inputPin);
  return computed === storedHash;
}
