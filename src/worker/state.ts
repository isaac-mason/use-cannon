import { World } from 'cannon-es'

const world = new World()

export const state = {
  bodies: {},
  bodiesNeedSyncing: false,
  config: { step: 1 / 60 },
  constraints: {},
  materials: {},
  rays: {},
  springInstances: {},
  springs: {},
  subscriptions: {},
  vehicles: {},
  world,
}
