// Utilitários só do navegador.

export const SLUG_RE = /^[a-z0-9-]{1,40}$/

// Roda a cada tecla, então não pode dar trim: o espaço digitado vira "-".
export function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .slice(0, 40)
}

// Sem letras/números parecidos (l/1, o/0) para ser fácil de digitar no celular.
export function randomSlug() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

// Id desta aba/aparelho, usado só para saber quais itens são "meus".
// sessionStorage: sobrevive ao recarregar, mas cada aba conta como um aparelho.
let device = ''
export function deviceId() {
  if (device) return device
  try {
    device = sessionStorage.getItem('copy:device') || ''
    if (!device) {
      device = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('copy:device', device)
    }
  } catch {
    device ||= Math.random().toString(36).slice(2)
  }
  return device
}

const key = (slug: string) => `copy:token:${slug}`

export function saveToken(slug: string, token: string) {
  try {
    sessionStorage.setItem(key(slug), token)
  } catch {}
}

export function loadToken(slug: string) {
  try {
    return sessionStorage.getItem(key(slug))
  } catch {
    return null
  }
}

export function forgetToken(slug: string) {
  try {
    sessionStorage.removeItem(key(slug))
  } catch {}
}

/**
 * navigator.clipboard só existe em HTTPS/localhost. Acessando pelo IP da rede
 * (http://192.168...) ele some, então caímos no método antigo.
 */
export async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {}
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  ta.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {}
  ta.remove()
  return ok
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const messages: Record<string, string> = {
  INVALID_SLUG: 'Use só letras, números e hífen (até 40).',
  WRONG_PASSWORD: 'Senha incorreta.',
  NOT_FOUND: 'Esse espaço não existe mais.',
  UNAUTHORIZED: 'Sua sessão expirou. Entre de novo.',
  TOO_LARGE: 'Muito grande. Limite de 25 MB por arquivo.',
  INVALID: 'Nada para enviar.',
}

export function errorMessage(err: unknown) {
  const code = err instanceof Error ? err.message : String(err)
  return messages[code] ?? 'Algo deu errado. Tente de novo.'
}
