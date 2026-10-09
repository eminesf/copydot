// Tipos compartilhados entre servidor e navegador.

// `by` = id do aparelho que enviou (para mostrar "meus" itens à direita, como num chat).
export type Item =
  | { id: string; kind: 'text'; by: string; text: string; createdAt: number }
  | { id: string; kind: 'file'; by: string; name: string; mime: string; size: number; createdAt: number }

export type RoomEvent =
  | { type: 'init'; items: Item[]; online: number; locked: boolean }
  | { type: 'item'; item: Item }
  | { type: 'delete'; id: string }
  | { type: 'online'; count: number }
