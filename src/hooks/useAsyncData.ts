import { useState, useEffect, useCallback } from 'react'

/**
 * Generic async data-loading hook.
 * Replaces the repetitive useState(loading) + useEffect + load() pattern.
 *
 * @param {Function} fetcher  Async function returning data
 * @param {Array}    deps     Dependency array (defaults to [])
 * @returns {{ data, loading, error, reload }}
 */
export default function useAsyncData(fetcher, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (signal?.cancelled) return
      setData(result)
    } catch (err) {
      if (signal?.cancelled) return
      console.error(err)
      setError(err)
    } finally {
      if (!signal?.cancelled) setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    return () => { signal.cancelled = true }
  }, [load])

  return { data, loading, error, reload: load, setData }
}
