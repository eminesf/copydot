// Server functions: no navegador viram chamadas HTTP (RPC) geradas pelo
// TanStack Start; o corpo de .handler() só existe no servidor.
import { createServerFn } from '@tanstack/react-start'
import * as rooms from '../server/rooms'

type Auth = { slug: string; token: string }

function str(v: unknown, field: string) {
  if (typeof v !== 'string') throw new Error(`INVALID:${field}`)
  return v
}

// Converte RoomError no código ('WRONG_PASSWORD' etc.) que a UI entende.
function run<T>(fn: () => T): T {
  try {
    return fn()
  } catch (err) {
    if (err instanceof rooms.RoomError) throw new Error(err.code)
    throw err
  }
}

export const enterRoom = createServerFn({ method: 'POST' })
  .validator((d: { slug: string; password: string }) => ({
    slug: str(d.slug, 'slug'),
    password: str(d.password, 'password'),
  }))
  .handler(({ data }) => run(() => rooms.enterRoom(data.slug, data.password)))

export const sendText = createServerFn({ method: 'POST' })
  .validator((d: Auth & { by: string; text: string }) => ({
    slug: str(d.slug, 'slug'),
    token: str(d.token, 'token'),
    by: str(d.by, 'by'),
    text: str(d.text, 'text'),
  }))
  .handler(({ data }) => run(() => rooms.addText(data.slug, data.token, data.by, data.text)))

export const deleteItem = createServerFn({ method: 'POST' })
  .validator((d: Auth & { id: string }) => ({
    slug: str(d.slug, 'slug'),
    token: str(d.token, 'token'),
    id: str(d.id, 'id'),
  }))
  .handler(({ data }) => run(() => rooms.deleteItem(data.slug, data.token, data.id)))

export const clearRoom = createServerFn({ method: 'POST' })
  .validator((d: Auth) => ({ slug: str(d.slug, 'slug'), token: str(d.token, 'token') }))
  .handler(({ data }) => run(() => rooms.clearRoom(data.slug, data.token)))
