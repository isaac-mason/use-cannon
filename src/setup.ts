import type { MutableRefObject } from 'react'
import { createContext } from 'react'

import type { BodyProps, BodyShapeType, CannonEvents, Refs, Subscriptions } from './worker'
import type { CannonWorkerApi } from './worker/cannon-worker-api'

export type ProviderContext = {
  bodies: MutableRefObject<{ [uuid: string]: number }>
  events: CannonEvents
  refs: Refs
  subscriptions: Subscriptions
  worker: CannonWorkerApi
}

export type DebugApi = {
  add(id: string, props: BodyProps, type: BodyShapeType): void
  remove(id: string): void
}

export const context = createContext<ProviderContext>({} as ProviderContext)
export const debugContext = createContext<DebugApi>(null!)
