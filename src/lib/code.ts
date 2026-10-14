// Blocos de código no estilo Teams/Slack: ```linguagem ... ```
// `lib/common` traz ~35 linguagens populares (o pacote completo é bem maior).
import hljs from 'highlight.js/lib/common'

export type Segment = { kind: 'text'; text: string } | { kind: 'code'; lang: string; code: string }

// Linguagens oferecidas no seletor do composer ('' = detectar sozinho).
export const LANGUAGES: { id: string; label: string }[] = [
  { id: '', label: 'Detectar' },
  { id: 'plaintext', label: 'Texto puro' },
  { id: 'bash', label: 'Bash / Shell' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'css', label: 'CSS' },
  { id: 'diff', label: 'Diff' },
  { id: 'go', label: 'Go' },
  { id: 'xml', label: 'HTML / XML' },
  { id: 'java', label: 'Java' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'json', label: 'JSON' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'php', label: 'PHP' },
  { id: 'python', label: 'Python' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'rust', label: 'Rust' },
  { id: 'sql', label: 'SQL' },
  { id: 'swift', label: 'Swift' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'yaml', label: 'YAML' },
]

// ``` + linguagem opcional na mesma linha, conteúdo, ``` de fechamento.
const FENCE_RE = /```([\w+#.-]*)[^\S\n]*\n?([\s\S]*?)\n?```/g

/** Separa o texto em trechos comuns e blocos de código. */
export function parseMessage(text: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(FENCE_RE)) {
    const before = text.slice(last, m.index).replace(/^\n+|\n+$/g, '')
    if (before) out.push({ kind: 'text', text: before })
    out.push({ kind: 'code', lang: m[1].toLowerCase(), code: m[2] })
    last = m.index + m[0].length
  }
  const rest = text.slice(last).replace(/^\n+|\n+$/g, '')
  if (rest || out.length === 0) out.push({ kind: 'text', text: rest })
  return out
}

/** Monta o texto enviado quando o composer está no modo código. */
export function fence(code: string, lang: string) {
  return '```' + lang + '\n' + code.replace(/\n+$/, '') + '\n```'
}

/** HTML com as cores (o highlight.js já escapa o código) + nome da linguagem. */
export function highlight(code: string, lang: string) {
  const known = lang && hljs.getLanguage(lang)
  const res = known ? hljs.highlight(code, { language: lang }) : hljs.highlightAuto(code)
  const id = res.language ?? 'plaintext'
  const label = LANGUAGES.find((l) => l.id === id)?.label ?? hljs.getLanguage(id)?.name ?? id
  return { html: res.value, label: id === 'plaintext' ? 'Texto' : label }
}
