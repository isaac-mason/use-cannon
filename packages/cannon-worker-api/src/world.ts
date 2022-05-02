import type { CannonWorkerProps } from './cannon-worker-api'
import { CannonWorkerAPI } from './cannon-worker-api'
import type { ContactMaterial } from './contact-material'
import type { CannonEvents, Refs, ScaleOverrides, Subscriptions } from './types'

export type WorldProps = CannonWorkerProps

export class World {
  bodies: { [uuid: string]: number } = {}
  events: CannonEvents = {}
  refs: Refs = {}
  scaleOverrides: ScaleOverrides = {}
  subscriptions: Subscriptions = {}
  worker: CannonWorkerAPI

  constructor({
    allowSleep = false,
    axisIndex = 0,
    broadphase = 'Naive',
    defaultContactMaterial = { contactEquationStiffness: 1e6 },
    gravity = [0, -9.81, 0],
    iterations = 5,
    quatNormalizeFast = false,
    quatNormalizeSkip = 0,
    size = 1000,
    solver = 'GS',
    tolerance = 0.001,
  }: WorldProps) {
    this.worker = new CannonWorkerAPI({
      allowSleep,
      axisIndex,
      broadphase,
      defaultContactMaterial,
      gravity,
      iterations,
      quatNormalizeFast,
      quatNormalizeSkip,
      size,
      solver,
      tolerance,
    })
  }

  addContactMaterial(material: ContactMaterial): void {
    this.worker.addContactMaterial({
      props: [material.materialA, material.materialB, material.options],
      uuid: material.id,
    })
  }

  removeContactMaterial(material: ContactMaterial): void {
    this.worker.removeContactMaterial({ uuid: material.id })
  }
}
