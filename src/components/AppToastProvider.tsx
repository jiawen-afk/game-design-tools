import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'

export type AppToastType = 'success' | 'warning' | 'error' | 'info'

export interface AppToastOptions {
  type?: AppToastType
  title: string
  description?: string
  durationMs?: number
}

interface AppToast extends Required<Pick<AppToastOptions, 'type' | 'title' | 'durationMs'>> {
  id: string
  description?: string
  expiresAt: number
  remainingMs: number
  paused: boolean
}

interface AppToastContextValue {
  showToast: (options: AppToastOptions) => string
  dismissToast: (id: string) => void
}

const DEFAULT_TOAST_DURATION_MS = 5200
const AppToastContext = createContext<AppToastContextValue | null>(null)

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AppToast[]>([])
  const toastIdRef = useRef(0)

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((options: AppToastOptions) => {
    const durationMs = options.durationMs ?? DEFAULT_TOAST_DURATION_MS
    const id = `toast-${Date.now()}-${toastIdRef.current++}`

    setToasts((current) => [
      ...current,
      {
        id,
        type: options.type ?? 'info',
        title: options.title,
        description: options.description,
        durationMs,
        expiresAt: Date.now() + durationMs,
        remainingMs: durationMs,
        paused: false,
      },
    ].slice(-5))

    return id
  }, [])

  const pauseToast = useCallback((id: string) => {
    setToasts((current) => current.map((toast) => {
      if (toast.id !== id || toast.paused) {
        return toast
      }

      return {
        ...toast,
        paused: true,
        remainingMs: Math.max(0, toast.expiresAt - Date.now()),
      }
    }))
  }, [])

  const resumeToast = useCallback((id: string) => {
    setToasts((current) => current.map((toast) => {
      if (toast.id !== id || !toast.paused) {
        return toast
      }

      const remainingMs = Math.max(1, toast.remainingMs)
      return {
        ...toast,
        paused: false,
        remainingMs,
        expiresAt: Date.now() + remainingMs,
      }
    }))
  }, [])

  useEffect(() => {
    const timers = toasts
      .filter((toast) => !toast.paused)
      .map((toast) => window.setTimeout(
        () => dismissToast(toast.id),
        Math.max(0, toast.expiresAt - Date.now()),
      ))

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [dismissToast, toasts])

  const contextValue = useMemo<AppToastContextValue>(() => ({
    showToast,
    dismissToast,
  }), [dismissToast, showToast])

  return (
    <AppToastContext.Provider value={contextValue}>
      {children}
      <div className="app-toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={`app-toast app-toast-${toast.type}`}
            role="status"
            onMouseEnter={() => pauseToast(toast.id)}
            onMouseLeave={() => resumeToast(toast.id)}
          >
            <div className="app-toast-content">
              <strong>{toast.title}</strong>
              {toast.description ? <p>{toast.description}</p> : null}
            </div>
            <button
              className="app-toast-close"
              type="button"
              aria-label="关闭弹框"
              onClick={() => dismissToast(toast.id)}
            >
              <CloseOutlined aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </AppToastContext.Provider>
  )
}

export function useAppToast() {
  const context = useContext(AppToastContext)
  if (!context) {
    throw new Error('useAppToast must be used within AppToastProvider')
  }

  return context
}
