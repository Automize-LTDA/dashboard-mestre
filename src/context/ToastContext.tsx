import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastMessage {
  id: string
  text: string
  type: ToastType
}

interface ToastContextType {
  showToast: (text: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((text: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, text, type }])
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          let bgClass = 'bg-white border-slate-100 text-slate-800'
          let Icon = Info
          let iconColor = 'text-blue-500'
          
          if (toast.type === 'success') {
            bgClass = 'bg-emerald-50 border-emerald-100 text-emerald-800'
            Icon = CheckCircle2
            iconColor = 'text-emerald-500'
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-50 border-rose-100 text-rose-800'
            Icon = AlertCircle
            iconColor = 'text-rose-500'
          } else if (toast.type === 'warning') {
            bgClass = 'bg-amber-50 border-amber-100 text-amber-800'
            Icon = AlertTriangle
            iconColor = 'text-amber-500'
          }

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto animate-fade-in-up transition-all ${bgClass}`}
              style={{ animationDuration: '0.3s' }}
            >
              <Icon size={18} className={`${iconColor} shrink-0 mt-0.5`} />
              <div className="text-xs font-semibold flex-1 leading-relaxed">
                {toast.text}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-0.5 hover:bg-slate-100/50 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
