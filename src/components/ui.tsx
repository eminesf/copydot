import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Link2, Share2 } from 'lucide-react'
import { renderSVG } from 'uqr'
import { copyText } from '../lib/client'

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="copy — início">
      copy<b>.</b>
    </Link>
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
