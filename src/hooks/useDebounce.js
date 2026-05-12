// src/hooks/useDebounce.js
// [FIX-L3] Debounce hook — mencegah excessive API/filter calls saat user mengetik.
// Default delay 350ms — cukup responsif tapi tidak spam re-render.
//
// Usage:
//   const debouncedSearch = useDebounce(search, 350);
//   // Gunakan debouncedSearch di useEffect/filter, bukan search langsung
import { useState, useEffect } from 'react';

/**
 * Mengembalikan nilai yang baru di-update setelah delay ms berlalu
 * sejak terakhir kali value berubah.
 *
 * @param {*}      value  - Nilai yang ingin di-debounce
 * @param {number} delay  - Delay dalam milidetik (default: 350)
 * @returns {*} Debounced value
 */
export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
