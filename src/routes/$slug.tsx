// Página da sala: /$slug (ex: /meu-espaco). "$slug" vira params.slug.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Camera,
  Check,
  Copy,
  Download,
  FileText,
  ImageIcon,
  Inbox,
  Link2,
  Lock,
  Paperclip,
  QrCode,
  Share2,
  Timer,
  Trash2,
} from 'lucide-react'
import { clearRoom, deleteItem, enterRoom, sendText } from '../lib/api'
import {
  SLUG_RE,
  copyText,
  deviceId,
  errorMessage,
  forgetToken,
  formatSize,
  loadToken,
  saveToken,
} from '../lib/client'
import type { Item, RoomEvent } from '../lib/types'
import { Logo, QrFloat, shareOrCopy, useCurrentUrl, useQr, useToast } from '../components/ui'

export const Route = createFileRoute('/$slug')({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} · copy` }] }),
  component: RoomPage,
})

type Phase = 'entering' | 'password' | 'ready' | 'invalid' | 'expired'
type Conn = 'connecting' | 'online' | 'offline'

// Ping leve a cada 4 min com a sala aberta: hospedagens grátis (ex: Render)
// desligam o servidor após 15 min sem requisições chegando.
const KEEPALIVE_MS = 4 * 60 * 1000

function RoomPage() {
  const { slug } = Route.useParams()
  const [phase, setPhase] = useState<Phase>('entering')
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const lastCreate = useRef(true)

  // 1) Conseguir um token. `create` = pode criar a sala se ela não existir.
  const enter = useCallback(
    async (password: string, create: boolean) => {
      lastCreate.current = create
      setError('')
      try {
        const res = await enterRoom({ data: { slug, password, create } })
        saveToken(slug, res.token)
        setToken(res.token)
        setPhase('ready')
      } catch (err) {
        const code = err instanceof Error ? err.message : ''
        if (code === 'WRONG_PASSWORD') {
          setPhase('password')
          if (password) setError(errorMessage(err))
        } else if (code === 'NOT_FOUND') {
          setPhase('expired')
        } else {
          setError(errorMessage(err))
        }
      }
    },
    [slug],
  )

  useEffect(() => {
    if (!SLUG_RE.test(slug)) return setPhase('invalid')
    const saved = loadToken(slug)
    if (saved) {
      setToken(saved)
      setPhase('ready')
    } else {
      // Abrir um link novo cria a sala, igual a digitar o nome na home.
      setPhase('entering')
      enter('', true)
    }
  }, [slug, enter])

  // A conexão foi recusada (servidor reiniciou ou sala expirou). Tenta reentrar
  // SEM criar: se a sala sumiu, mostramos "expirou" em vez de recriar sem senha.
  const expire = useCallback(() => {
    forgetToken(slug)
    setToken(null)
    setPhase('entering')
    enter('', false)
  }, [slug, enter])

  if (phase === 'expired') {
    return (
      <div className="center-screen">
        <div className="gate">
          <Logo />
          <h1>
            <Timer size={18} /> Este espaço expirou
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
            Ele foi apagado porque ficou sem ninguém conectado ou o servidor reiniciou. O conteúdo não pode ser
            recuperado.
          </p>
          <button className="btn btn-primary" onClick={() => enter('', true)}>
            Criar <span className="mono">{slug}</span> de novo
          </button>
          <Link to="/" className="btn">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  if (phase === 'invalid') {
    return (
      <div className="center-screen">
        <div>
          <p>Nome inválido. Use só letras minúsculas, números e hífen.</p>
          <Link to="/" className="btn">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  if (phase === 'password') return <PasswordGate slug={slug} error={error} onSubmit={(pw) => enter(pw, true)} />

  if (phase === 'entering' || !token) {
    return (
      <div className="center-screen" aria-live="polite">
        {error ? (
          <div>
            <p>{error}</p>
            <button className="btn" onClick={() => enter('', lastCreate.current)}>
              Tentar de novo
            </button>
          </div>
        ) : (
          'Entrando…'
        )}
      </div>
    )
  }

  return <Room slug={slug} token={token} onExpired={expire} />
}

function PasswordGate(props: { slug: string; error: string; onSubmit: (pw: string) => void }) {
  const [pw, setPw] = useState('')
  return (
    <div className="center-screen">
      <form
        className="gate"
        onSubmit={(e) => {
          e.preventDefault()
          props.onSubmit(pw)
        }}
      >
        <Logo />
        <h1>
          <Lock size={18} /> <span className="mono">{props.slug}</span>
        </h1>
        <label htmlFor="pw" style={{ color: 'var(--muted)', fontSize: 14 }}>
          Esse espaço é protegido. Digite a senha para entrar.
        </label>
        <input
          id="pw"
          className="field"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        {props.error && (
          <p className="form-error" role="alert">
            {props.error}
          </p>
        )}
        <button className="btn btn-primary" type="submit">
          Entrar
        </button>
      </form>
    </div>
  )
}

function Room({ slug, token, onExpired }: { slug: string; token: string; onExpired: () => void }) {
  const navigate = useNavigate()
  const me = deviceId()
  const url = useCurrentUrl()
  const [toast, notify] = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [online, setOnline] = useState(0)
  const [locked, setLocked] = useState(false)
  const [conn, setConn] = useState<Conn>('connecting')
  const [loaded, setLoaded] = useState(false)
  const [uploads, setUploads] = useState<{ id: number; name: string; pct: number }[]>([])
  const [dragging, setDragging] = useState(false)
  const [sheet, setSheet] = useState(false)

  // 2) Tempo real: abre o EventSource e aplica cada evento recebido.
  useEffect(() => {
    let es: EventSource | null = null
    let retry: ReturnType<typeof setTimeout> | undefined

    function connect() {
      es?.close()
      setConn('connecting')
      es = new EventSource(`/api/rooms/${encodeURIComponent(slug)}/events?t=${encodeURIComponent(token)}`)
      es.onopen = () => setConn('online')
      es.onmessage = (msg) => {
        const ev = JSON.parse(msg.data) as RoomEvent
        if (ev.type === 'init') {
          setItems(ev.items)
          setOnline(ev.online)
          setLocked(ev.locked)
          setLoaded(true)
        } else if (ev.type === 'item') {
          setItems((prev) => (prev.some((i) => i.id === ev.item.id) ? prev : [...prev, ev.item]))
        } else if (ev.type === 'delete') {
          setItems((prev) => prev.filter((i) => i.id !== ev.id))
        } else if (ev.type === 'online') {
          setOnline(ev.count)
        }
      }
      es.onerror = () => {
        setConn('offline')
        // CONNECTING = o próprio navegador vai tentar de novo.
        // CLOSED = o servidor recusou (sala expirou ou token inválido).
        if (es?.readyState === EventSource.CLOSED) retry = setTimeout(onExpired, 1500)
      }
    }

    // Celular costuma matar conexões em segundo plano; reconecta ao voltar.
    function onVisible() {
      if (document.visibilityState === 'visible' && es?.readyState === EventSource.CLOSED) connect()
    }

    connect()
    document.addEventListener('visibilitychange', onVisible)
    const keepalive = setInterval(() => {
      fetch('/api/health', { cache: 'no-store' }).catch(() => {})
    }, KEEPALIVE_MS)
    return () => {
      clearInterval(keepalive)
      clearTimeout(retry)
      document.removeEventListener('visibilitychange', onVisible)
      es?.close()
    }
  }, [slug, token, onExpired])

  // Upload com XMLHttpRequest só para ter barra de progresso (fetch não tem).
  const upload = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const id = Math.random()
        const name = file.name && file.name !== 'image.png' ? file.name : `print-${Date.now()}.png`
        setUploads((u) => [...u, { id, name, pct: 0 }])
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `/api/rooms/${encodeURIComponent(slug)}/upload`)
        xhr.setRequestHeader('x-token', token)
        xhr.setRequestHeader('x-device', me)
        xhr.setRequestHeader('x-filename', encodeURIComponent(name))
        xhr.setRequestHeader('content-type', file.type || 'application/octet-stream')
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploads((u) => u.map((x) => (x.id === id ? { ...x, pct: Math.round((e.loaded / e.total) * 100) } : x)))
          }
        }
        xhr.onloadend = () => {
          setUploads((u) => u.filter((x) => x.id !== id))
          if (xhr.status === 401 || xhr.status === 404) onExpired()
          else if (xhr.status >= 400 || xhr.status === 0) notify(errorMessage(new Error(xhr.responseText || 'x')))
        }
        xhr.send(file)
      }
    },
    [slug, token, me, onExpired, notify],
  )

  // Colar (Ctrl+V / colar no celular) e arrastar arquivos em qualquer lugar da página.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length) {
        e.preventDefault()
        upload(files)
      }
    }
    function onDragOver(e: DragEvent) {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault()
        setDragging(true)
      }
    }
    function onDragLeave(e: DragEvent) {
      if (!e.relatedTarget) setDragging(false)
    }
    function onDrop(e: DragEvent) {
      const files = Array.from(e.dataTransfer?.files ?? [])
      setDragging(false)
      if (files.length) {
        e.preventDefault()
        upload(files)
      }
    }
    window.addEventListener('paste', onPaste)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [upload])

  const call = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn()
        return true
      } catch (err) {
        const code = err instanceof Error ? err.message : ''
        if (code === 'UNAUTHORIZED' || code === 'NOT_FOUND') onExpired()
        else notify(errorMessage(err))
        return false
      }
    },
    [onExpired, notify],
  )

  // Rola para o fim quando chega item novo (como num chat).
  const feedRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [items.length, uploads.length])

  const status =
    conn === 'online' ? `${online} ${online === 1 ? 'aparelho' : 'aparelhos'}` : conn === 'connecting' ? 'conectando' : 'offline'

  return (
    <div className="room">
      <header className="room-header">
        <div className="inner">
          <div className="crumb">
            <Logo />
            <span className="sep">/</span>
            <span className="slug">{slug}</span>
          </div>
          {locked && (
            <span className="badge accent" title="Protegido por senha">
              <Lock size={11} />
              <span className="hide-xs">senha</span>
            </span>
          )}
          <span className="badge" aria-live="polite">
            <span className={`dot ${conn}`} />
            {status}
          </span>
          <span className="spacer" />
          <button className="btn btn-ghost btn-icon mobile-only" aria-label="Conectar outro aparelho" onClick={() => setSheet(true)}>
            <QrCode size={20} />
          </button>
          <button className="btn btn-sm" onClick={() => navigate({ to: '/' })}>
            Sair
          </button>
        </div>
      </header>

      <div className="feed" ref={feedRef}>
        <div className="inner">
          {loaded && items.length === 0 && uploads.length === 0 && (
            <div className="empty">
              <span className="icon">
                <Inbox size={26} />
              </span>
              <strong>Ainda não há nada aqui</strong>
              <p>Envie algo abaixo e abra este espaço no outro aparelho.</p>
              <button className="btn mobile-only" onClick={() => setSheet(true)}>
                <QrCode size={16} /> Conectar outro aparelho
              </button>
            </div>
          )}

          {items.map((item) => (
            <Message
              key={item.id}
              item={item}
              mine={item.by === me}
              fileUrl={`/api/rooms/${encodeURIComponent(slug)}/files/${item.id}?t=${encodeURIComponent(token)}`}
              onDelete={() => call(() => deleteItem({ data: { slug, token, id: item.id } }))}
              onNotify={notify}
            />
          ))}
        </div>
      </div>

      <div className="composer-wrap">
        <Composer
          uploads={uploads}
          canClear={items.length > 0}
          onSend={(text) => call(() => sendText({ data: { slug, token, by: me, text } }))}
          onFiles={upload}
          onClear={() => call(() => clearRoom({ data: { slug, token } }))}
        />
        <p className="drop-note desktop-only">Arraste arquivos para cá ou cole uma imagem com Ctrl+V</p>
      </div>

      <QrFloat url={url} label="Escaneie para entrar" onNotify={notify} />
      {sheet && <ConnectSheet url={url} slug={slug} onClose={() => setSheet(false)} onNotify={notify} />}
      {dragging && <div className="drop-overlay">Solte para enviar</div>}
      {toast}
    </div>
  )
}

function ConnectSheet(props: { url: string; slug: string; onClose: () => void; onNotify: (m: string) => void }) {
  const qr = useQr(props.url)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])

  return (
    <div className="sheet-backdrop" onClick={props.onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Conectar outro aparelho" onClick={(e) => e.stopPropagation()}>
        <h2>Conectar outro aparelho</h2>
        <p>
          Escaneie o código ou digite <b className="mono">{props.slug}</b> na página inicial.
        </p>
        {qr && <img src={qr} alt={`QR code de ${props.url}`} />}
        <div className="row">
          <button
            className="btn"
            onClick={async () => props.onNotify((await copyText(props.url)) ? 'Link copiado' : 'Não deu para copiar')}
          >
            <Link2 size={17} /> Copiar link
          </button>
          <button className="btn btn-primary" onClick={() => shareOrCopy(props.url, 'copy', props.onNotify)}>
            <Share2 size={17} /> Compartilhar
          </button>
        </div>
      </div>
    </div>
  )
}

function Composer(props: {
  uploads: { id: number; name: string; pct: number }[]
  canClear: boolean
  onSend: (text: string) => Promise<boolean>
  onFiles: (files: File[]) => void
  onClear: () => void
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [armed, setArmed] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  // Cresce com o texto até 200px.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [text])

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    if (await props.onSend(text)) setText('')
    setSending(false)
    ref.current?.focus()
  }

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.onFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <div className="toolbar">
        <label className="btn btn-ghost btn-sm" title="Arquivo">
          <Paperclip size={16} /> <span className="lbl">Arquivo</span>
          <input type="file" multiple hidden onChange={pick} />
        </label>
        <label className="btn btn-ghost btn-sm" title="Imagem">
          <ImageIcon size={16} /> <span className="lbl">Imagem</span>
          <input type="file" accept="image/*" multiple hidden onChange={pick} />
        </label>
        <label className="btn btn-ghost btn-sm mobile-only" title="Câmera">
          <Camera size={16} /> <span className="lbl">Câmera</span>
          <input type="file" accept="image/*" capture="environment" hidden onChange={pick} />
        </label>
        <span className="spacer" />
        {props.canClear && (
          <button
            type="button"
            className={`btn btn-ghost btn-sm btn-danger${armed ? ' armed' : ''}`}
            onClick={() => {
              if (armed) props.onClear()
              setArmed(!armed)
            }}
          >
            <Trash2 size={15} /> <span className="lbl">{armed ? 'Confirmar' : 'Limpar tudo'}</span>
          </button>
        )}
      </div>

      {props.uploads.length > 0 && (
        <ul className="uploads" aria-label="Enviando">
          {props.uploads.map((u) => (
            <li key={u.id}>
              <span className="name">{u.name}</span>
              <span className="bar">
                <i style={{ width: `${u.pct}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <textarea
        ref={ref}
        aria-label="Texto para compartilhar"
        value={text}
        rows={1}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // No computador: Enter envia, Shift+Enter quebra linha.
          // No celular o Enter do teclado quebra linha e o botão envia.
          const touch = window.matchMedia('(pointer: coarse)').matches
          if (e.key === 'Enter' && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
            e.preventDefault()
            send()
          }
        }}
        placeholder="Digite ou cole aqui…"
      />
      <div className="bottom">
        <span className="hint desktop-only">Enter envia · Shift+Enter nova linha</span>
        <span className="hint mobile-only" />
        <button type="submit" className="btn btn-primary" disabled={!text.trim() || sending}>
          Enviar
        </button>
      </div>
    </form>
  )
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  )
}

function Message(props: { item: Item; mine: boolean; fileUrl: string; onDelete: () => void; onNotify: (m: string) => void }) {
  const { item } = props
  const [copied, setCopied] = useState(false)
  const time = new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const isImage = item.kind === 'file' && item.mime.startsWith('image/')

  async function copy() {
    if (item.kind !== 'text') return
    if (await copyText(item.text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } else props.onNotify('Não deu para copiar')
  }

  return (
    <article className={`msg${props.mine ? ' mine' : ''}`}>
      <span className="meta">
        {props.mine ? 'Você' : 'Outro aparelho'} · {time}
      </span>
      <div className="bubble">
        {item.kind === 'text' ? (
          <p className="text">
            <Linkified text={item.text} />
          </p>
        ) : (
          <>
            {isImage && (
              <a className="preview" href={props.fileUrl} target="_blank" rel="noopener noreferrer">
                <img src={props.fileUrl} alt={item.name} />
              </a>
            )}
            <div className="file-row">
              <span className="file-icon">{isImage ? <ImageIcon size={18} /> : <FileText size={18} />}</span>
              <span style={{ minWidth: 0 }}>
                <span className="name">{item.name}</span>
                <span className="size">{formatSize(item.size)}</span>
              </span>
            </div>
          </>
        )}
        <div className="actions">
          {item.kind === 'text' ? (
            <button className="btn btn-ghost copy" onClick={copy}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          ) : (
            <a className="btn btn-ghost copy" href={`${props.fileUrl}&download`} download={item.name}>
              <Download size={15} /> Baixar
            </a>
          )}
          <button className="btn btn-ghost" onClick={props.onDelete} aria-label="Excluir">
            <Trash2 size={15} /> <span className="hide-xs">Excluir</span>
          </button>
        </div>
      </div>
    </article>
  )
}
