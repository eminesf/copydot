// Estado das salas, só no servidor. Fica em memória: quando o processo
// reinicia, tudo some — o que combina com a proposta de algo temporário.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { Item, RoomEvent } from '../lib/types'

export const SLUG_RE = /^[a-z0-9-]{1,40}$/
export const MAX_TEXT = 100_000
export const MAX_FILE = 25 * 1024 * 1024
const MAX_ROOM_BYTES = 100 * 1024 * 1024
const MAX_ITEMS = 100
const EXPIRE_MS = 10 * 60 * 1000

type Subscriber = (event: RoomEvent) => void

interface Room {
  slug: string
  password: { salt: Buffer; hash: Buffer } | null
  tokens: Set<string>
  items: Item[]
  files: Map<string, Buffer>
  bytes: number
  subscribers: Set<Subscriber>
  expireTimer: ReturnType<typeof setTimeout> | null
}

// Guardado em globalThis para sobreviver ao hot reload do Vite em dev.
const g = globalThis as unknown as { __rooms?: Map<string, Room> }
const rooms = (g.__rooms ??= new Map<string, Room>())

export class RoomError extends Error {
  constructor(
    public code: 'INVALID_SLUG' | 'NOT_FOUND' | 'WRONG_PASSWORD' | 'UNAUTHORIZED' | 'TOO_LARGE' | 'INVALID',
    public status: number,
  ) {
    super(code)
  }
}

function hashPassword(password: string, salt: Buffer = randomBytes(16)) {
  return { salt, hash: scryptSync(password, salt, 32) }
}

function newId() {
  return randomBytes(8).toString('hex')
}

/**
 * Entra na sala. Com `create`, cria se não existir (quem cria define a senha).
 * Sem `create` (reconexão automática), uma sala que sumiu dá NOT_FOUND. Isso evita
 * recriar sozinha, sem senha, uma sala que tinha senha antes de o servidor reiniciar.
 */
export function enterRoom(slug: string, password: string, create: boolean) {
  if (!SLUG_RE.test(slug)) throw new RoomError('INVALID_SLUG', 400)

  let room = rooms.get(slug)
  let created = false
  if (!room && !create) throw new RoomError('NOT_FOUND', 404)
  if (!room) {
    room = {
      slug,
      password: password ? hashPassword(password) : null,
      tokens: new Set(),
      items: [],
      files: new Map(),
      bytes: 0,
      subscribers: new Set(),
      expireTimer: null,
    }
    rooms.set(slug, room)
    scheduleExpire(room)
    created = true
  } else if (room.password) {
    const { hash } = hashPassword(password, room.password.salt)
    if (!timingSafeEqual(hash, room.password.hash)) {
      throw new RoomError('WRONG_PASSWORD', 403)
    }
  }

  const token = randomBytes(24).toString('base64url')
  room.tokens.add(token)
  return { token, created, locked: room.password !== null }
}

function authed(slug: string, token: string) {
  const room = rooms.get(slug)
  if (!room) throw new RoomError('NOT_FOUND', 404)
  if (!room.tokens.has(token)) throw new RoomError('UNAUTHORIZED', 401)
  return room
}

function broadcast(room: Room, event: RoomEvent) {
  for (const send of room.subscribers) send(event)
}

function pushItem(room: Room, item: Item) {
  room.items.push(item)
  while (room.items.length > MAX_ITEMS) removeItem(room, room.items[0].id)
  broadcast(room, { type: 'item', item })
}

function removeItem(room: Room, id: string) {
  const idx = room.items.findIndex((i) => i.id === id)
  if (idx === -1) return
  const [item] = room.items.splice(idx, 1)
  if (item.kind === 'file') {
    room.bytes -= item.size
    room.files.delete(id)
  }
  broadcast(room, { type: 'delete', id })
}

// O id do aparelho não é segredo nem autenticação: só serve para a UI alinhar os balões.
const cleanBy = (by: string) => by.slice(0, 64)

export function addText(slug: string, token: string, by: string, text: string) {
  const room = authed(slug, token)
  if (!text.trim()) throw new RoomError('INVALID', 400)
  if (text.length > MAX_TEXT) throw new RoomError('TOO_LARGE', 413)
  pushItem(room, { id: newId(), kind: 'text', by: cleanBy(by), text, createdAt: Date.now() })
}

export function addFile(slug: string, token: string, by: string, name: string, mime: string, data: Buffer) {
  const room = authed(slug, token)
  if (data.length === 0) throw new RoomError('INVALID', 400)
  if (data.length > MAX_FILE || room.bytes + data.length > MAX_ROOM_BYTES) {
    throw new RoomError('TOO_LARGE', 413)
  }
  const id = newId()
  room.files.set(id, data)
  room.bytes += data.length
  pushItem(room, {
    id,
    kind: 'file',
    by: cleanBy(by),
    name: name.slice(0, 200) || 'arquivo',
    mime: mime || 'application/octet-stream',
    size: data.length,
    createdAt: Date.now(),
  })
}

export function getFile(slug: string, token: string, id: string) {
  const room = authed(slug, token)
  const item = room.items.find((i) => i.id === id)
  const data = room.files.get(id)
  if (!item || item.kind !== 'file' || !data) throw new RoomError('NOT_FOUND', 404)
  return { item, data }
}

export function deleteItem(slug: string, token: string, id: string) {
  removeItem(authed(slug, token), id)
}

/** Inscreve um ouvinte (uma aba aberta). Retorna a função de saída. */
export function subscribe(slug: string, token: string, send: Subscriber) {
  const room = authed(slug, token)
  if (room.expireTimer) clearTimeout(room.expireTimer)
  room.expireTimer = null

  room.subscribers.add(send)
  send({ type: 'init', items: room.items, online: room.subscribers.size, locked: !!room.password })
  broadcast(room, { type: 'online', count: room.subscribers.size })

  return () => {
    room.subscribers.delete(send)
    broadcast(room, { type: 'online', count: room.subscribers.size })
    if (room.subscribers.size === 0) scheduleExpire(room)
  }
}

// A sala é apagada 10 minutos depois que o último dispositivo sai.
function scheduleExpire(room: Room) {
  if (room.expireTimer) clearTimeout(room.expireTimer)
  room.expireTimer = setTimeout(() => {
    if (room.subscribers.size === 0) rooms.delete(room.slug)
  }, EXPIRE_MS)
}
