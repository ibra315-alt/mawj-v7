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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      console.error(err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load, setData }
}
