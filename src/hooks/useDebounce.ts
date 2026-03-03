import { useState, useEffect } from 'react'

/**
 * Debounces a value by the given delay (ms).
 * Returns the debounced value — updates only after the
 * caller stops changing the input for `delay` ms.
 */
export default function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
