import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Link2, Moon, Share2, Sun } from 'lucide-react'
import { renderSVG } from 'uqr'
import { copyText } from '../lib/client'

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="copy — início">
      copy<b>.</b>
    </Link>
  )
}

// Logos de marca em SVG (o lucide não traz mais ícones de marcas).
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.2-3.1-.1-.4-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

export function Footer() {
  // Ano calculado na hora: não precisa atualizar o código todo ano.
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <span>
        © {year} <b className="mono">copy.</b> · feito por Emiliano
      </span>
      <nav aria-label="Redes do autor">
        <a href="https://www.linkedin.com/in/emilianodasilveira" target="_blank" rel="noopener noreferrer">
          <LinkedinIcon /> LinkedIn
        </a>
        <a href="https://github.com/eminesf/" target="_blank" rel="noopener noreferrer">
          <GithubIcon /> GitHub
        </a>
      </nav>
    </footer>
  )
}

/** URL atual, só depois de montar (no SSR não existe window). */
export function useCurrentUrl() {
  const [url, setUrl] = useState('')
  useEffect(() => setUrl(window.location.origin + window.location.pathname), [])
  return url
}

export function useQr(url: string) {
  return useMemo(
    () => (url ? `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(url, { border: 1 }))}` : ''),
    [url],
  )
}

/** Compartilhar nativo (menu do celular) com fallback para copiar o link. */
export async function shareOrCopy(url: string, title: string, notify: (msg: string) => void) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }
  notify((await copyText(url)) ? 'Link copiado' : 'Não deu para copiar')
}

/** Cartão de QR flutuante no canto (só desktop). */
export function QrFloat(props: { url: string; label: string; onNotify: (msg: string) => void }) {
  const qr = useQr(props.url)
  if (!qr) return null
  return (
    <aside className="qr-float desktop-only" aria-label="QR code">
      <div className="qr-card">
        {props.label}
        <img src={qr} alt={`QR code de ${props.url}`} width={124} height={124} />
      </div>
      <div className="qr-actions">
        <button
          className="btn"
          onClick={async () => props.onNotify((await copyText(props.url)) ? 'Link copiado' : 'Não deu para copiar')}
        >
          <Link2 size={15} /> Copiar link
        </button>
        <button
          className="btn btn-primary btn-icon"
          aria-label="Compartilhar"
          onClick={() => shareOrCopy(props.url, 'copy', props.onNotify)}
        >
          <Share2 size={15} />
        </button>
      </div>
    </aside>
  )
}

type Theme = 'light' | 'dark'
const THEME_KEY = 'copy:theme'

// Roda no <head> antes da página pintar: aplica o tema salvo sem "piscar".
// Sem escolha salva, nada é marcado e o CSS segue o tema do sistema.
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

function currentTheme(): Theme {
  const forced = document.documentElement.dataset.theme
  if (forced === 'light' || forced === 'dark') return forced
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Alterna claro/escuro e lembra a escolha neste navegador. */
export function ThemeToggle({ className = 'btn btn-ghost btn-icon' }: { className?: string }) {
  // null até montar: no SSR não dá para saber o tema, então nem o ícone.
  const [theme, setTheme] = useState<Theme | null>(null)
  useEffect(() => setTheme(currentTheme()), [])

  function toggle() {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {}
    setTheme(next)
  }

  const label = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'
  return (
    <button type="button" className={className} aria-label={label} title={label} onClick={toggle}>
      {theme === 'dark' ? <Sun size={19} /> : theme === 'light' ? <Moon size={19} /> : null}
    </button>
  )
}

export function useToast() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 2200)
    return () => clearTimeout(t)
  }, [msg])
  const node = (
    <div aria-live="polite" role="status">
      {msg && <div className="toast">{msg}</div>}
    </div>
  )
  return [node, setMsg] as const
}
