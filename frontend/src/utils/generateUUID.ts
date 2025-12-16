const HEX_BASE = 16;
const BIT_MASK_3 = 0x3;
const BIT_MASK_8 = 0x8;

/**
 * Generates a UUID with fallback for environments where crypto.randomUUID is not available
 */
export function generateUUID(): string {
  // Check if crypto.randomUUID is available (modern browsers and Node.js 16.7.0+)
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  // Fallback implementation using crypto.getRandomValues or Math.random
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    // Use crypto.getRandomValues for better randomness
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] % HEX_BASE | 0;
      const v = c === 'x' ? r : (r & BIT_MASK_3) | BIT_MASK_8;
      return v.toString(HEX_BASE);
    });
  }

  // Final fallback using Math.random (less secure but widely compatible)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * HEX_BASE) | 0;
    const v = c === 'x' ? r : (r & BIT_MASK_3) | BIT_MASK_8;
    return v.toString(HEX_BASE);
  });
}
