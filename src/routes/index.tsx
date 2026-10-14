import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, ChevronDown, ClipboardPaste, Dices, Lock, PenLine, Smartphone, Timer, Zap } from 'lucide-react'
import { enterRoom } from '../lib/api'
import { SLUG_RE, errorMessage, normalizeSlug, randomSlug, saveToken } from '../lib/client'
import { FAQ, SITE_URL, homeJsonLd } from '../lib/seo'
import { Footer, QrFloat, ThemeToggle, useCurrentUrl, useToast } from '../components/ui'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ property: 'og:url', content: SITE_URL }],
    links: [{ rel: 'canonical', href: SITE_URL }],
    // Dados estruturados: ajudam o Google a entender a página (app grátis + FAQ).
    scripts: homeJsonLd().map((data) => ({ type: 'application/ld+json', children: JSON.stringify(data) })),
  }),
  component: Home,
})

const STEPS = [
  {
    icon: PenLine,
    title: 'Escolha um nome',
    text: 'Digite um nome para o seu espaço ou gere um aleatório. Se quiser, proteja com senha.',
  },
  {
    icon: Smartphone,
    title: 'Abra no outro aparelho',
    text: 'Leia o QR code ou digite o mesmo nome no celular, tablet ou outro computador.',
  },
  {
    icon: ClipboardPaste,
    title: 'Cole e pegue',
    text: 'Textos, links, prints e arquivos aparecem na hora em todos os aparelhos conectados.',
  },
]

function Home() {
  const navigate = useNavigate()
  const url = useCurrentUrl()
  const [toast, notify] = useToast()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [withPassword, setWithPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const slug = normalizeSlug(name).replace(/-+$/, '') || randomSlug()
    if (!SLUG_RE.test(slug)) return setError(errorMessage(new Error('INVALID_SLUG')))

    setBusy(true)
    setError('')
    try {
      const { token } = await enterRoom({ data: { slug, password: withPassword ? password : '', create: true } })
      saveToken(slug, token)
      await navigate({ to: '/$slug', params: { slug } })
    } catch (err) {
      if (err instanceof Error && err.message === 'WRONG_PASSWORD') setWithPassword(true)
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="home">
      <header className="site-header">
        <ThemeToggle />
      </header>
      <main>
        <section className="hero">
          <p className="wordmark" aria-label="copy.">
            copy<b>.</b>
          </p>
          <h1>
            Cole aqui.
            <br />
            <span>Copie no outro aparelho.</span>
          </h1>
          <p className="sub">
            Área de transferência online: texto, imagens e arquivos entre celular e computador. Sem cadastro, sem app.
          </p>

          <form className="entry" onSubmit={submit}>
            <div className="entry-field">
              <span className="slash" aria-hidden>
                /
              </span>
              <label htmlFor="name" className="sr-only">
                Nome do espaço
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(normalizeSlug(e.target.value))}
                placeholder="nome-do-espaco"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Gerar nome aleatório"
                title="Gerar nome aleatório"
                onClick={() => setName(randomSlug())}
              >
                <Dices size={20} />
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Entrando…' : 'Entrar'}
                {!busy && <ArrowRight size={17} />}
              </button>
            </div>

            <label className="lock-row">
              <span className="lock-icon">
                <Lock size={15} />
              </span>
              <span className="label">
                <b>Proteger com senha</b>
                <span className="hide-xs"> — mantenha privado</span>
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={withPassword}
                onChange={(e) => setWithPassword(e.target.checked)}
              />
              <span className="switch" aria-hidden />
            </label>

            {withPassword && (
              <input
                className="field"
                type="password"
                aria-label="Senha"
                placeholder="Senha do espaço"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            )}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>

          <ul className="perks">
            <li>
              <Zap size={14} /> Sem cadastro
            </li>
            <li>
              <Timer size={14} /> Some em 10 min
            </li>
            <li>
              <Lock size={14} /> Senha opcional
            </li>
          </ul>
        </section>

        <section className="info" aria-labelledby="como-funciona">
          <h2 id="como-funciona">Como funciona</h2>
          <ol className="steps-grid">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="step">
                <span className="step-icon">
                  <Icon size={20} />
                </span>
                <span className="step-num">{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="info" aria-labelledby="faq">
          <h2 id="faq">Perguntas frequentes</h2>
          <div className="faq">
            {FAQ.map(({ q, a }) => (
              <details key={q}>
                <summary>
                  {q}
                  <ChevronDown size={18} aria-hidden />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <QrFloat url={url} label="Abra no celular" onNotify={notify} />
      {toast}
    </div>
  )
}
