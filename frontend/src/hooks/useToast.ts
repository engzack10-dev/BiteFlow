import { useState, useCallback } from 'react'

export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string, durationMs = 3200) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, durationMs)
  }, [])

  return {
    toastMessage,
    showToast,
  }
}
