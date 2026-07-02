import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowRight, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logoUrl from '../assets/logo.png'

export const AcessoNegado: React.FC = () => {
  const { signOut, user, cargo } = useAuth()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(6)

  const REPORTS_SYSTEM_URL = 'http://localhost:5173/login'

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleRedirect()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  async function handleRedirect() {
    await signOut()
    window.location.href = REPORTS_SYSTEM_URL
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-[var(--shadow-soft)] text-center space-y-6 animate-fade-in-up">
        
        {/* Logo */}
        <div className="mx-auto w-fit p-3 bg-slate-50 rounded-xl border border-slate-100">
          <img src={logoUrl} alt="Produtos Do Mestre" className="h-10 w-auto object-contain" />
        </div>

        {/* Access Denied Icon & Message */}
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-[#E53935] animate-pulse">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold font-display text-[#233A7A] tracking-wide">
            Acesso Restrito
          </h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Olá, <span className="font-bold text-slate-700">{user?.email || 'usuário'}</span>. Seu cargo atual (<span className="font-bold text-[#E53935] uppercase">{cargo || 'Nenhum'}</span>) não possui permissão para acessar o Painel Executivo.
          </p>
        </div>

        {/* Warning card */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-400 space-y-1">
          <p className="font-bold text-slate-600">Por que fui bloqueado?</p>
          <p>Apenas gestores da Do Mestre (Administradores, Gestores e Supervisores Técnicos) podem entrar neste sistema.</p>
        </div>

        {/* Countdown */}
        <div className="text-xs text-slate-400">
          Você será redirecionado para o sistema de relatórios em <span className="font-bold text-[#233A7A] text-sm">{countdown}s</span>...
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleLogout}
            className="flex-1 h-11 border border-slate-200 text-xs font-bold rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={14} /> Voltar para o Login
          </button>
          
          <button
            onClick={handleRedirect}
            style={{ backgroundImage: 'var(--gradient-accent)' }}
            className="flex-1 h-11 text-xs font-bold rounded-xl text-white shadow-[var(--shadow-glow)] hover:scale-[1.02] transition-transform inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            Acessar Relatórios <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  )
}
export default AcessoNegado
