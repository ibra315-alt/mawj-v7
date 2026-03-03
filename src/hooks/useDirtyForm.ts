import { useState, useRef } from 'react'

export function useDirtyForm(realClose: () => void) {
  const initialRef = useRef<string>('')
  const [showWarn, setShowWarn] = useState(false)

  return {
    setInitial(values: any) {
      initialRef.current = JSON.stringify(values)
      setShowWarn(false)
    },
    attemptClose(current: any) {
      if (JSON.stringify(current) !== initialRef.current) setShowWarn(true)
      else realClose()
    },
    confirmDiscard() {
      setShowWarn(false)
      realClose()
    },
    cancelClose() {
      setShowWarn(false)
    },
    showWarn,
    markClean(values: any) {
      initialRef.current = JSON.stringify(values)
      setShowWarn(false)
    },
  }
}
