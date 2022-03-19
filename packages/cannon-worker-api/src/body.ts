import type { MaterialOptions } from 'cannon-es'
import type { Vector3 } from 'three'
import { Euler, Quaternion } from 'three'

import type {
  AtomicName,
  CollideBeginEvent,
  CollideEndEvent,
  CollideEvent,
  PropValue,
  Quad,
  SetOpName,
  SubscriptionName,
  SubscriptionTarget,
  Triplet,
  VectorName,
} from './types'
import type { World } from './world'

export type AtomicProps = {
  allowSleep: boolean
  angularDamping: number
  collisionFilterGroup: number
  collisionFilterMask: number
  collisionResponse: boolean
  fixedRotation: boolean
  isTrigger: boolean
  linearDamping: number
  mass: number
  material: MaterialOptions
  sleepSpeedLimit: number
  sleepTimeLimit: number
  userData: Record<PropertyKey, any>
}

export type VectorProps = Record<VectorName, Triplet>
type VectorTypes = Vector3 | Triplet

export type BodyProps<T extends any[] = unknown[]> = Partial<AtomicProps> &
  Partial<VectorProps> & {
    args?: T
    onCollide?: (e: CollideEvent) => void
    onCollideBegin?: (e: CollideBeginEvent) => void
    onCollideEnd?: (e: CollideEndEvent) => void
    quaternion?: Quad
    rotation?: Triplet
    type?: 'Dynamic' | 'Static' | 'Kinematic'
  }

export type BodyPropsArgsRequired<T extends any[] = unknown[]> = BodyProps<T> & {
  args: T
}

export type ShapeType =
  | 'Box'
  | 'ConvexPolyhedron'
  | 'Cylinder'
  | 'Heightfield'
  | 'Particle'
  | 'Plane'
  | 'Sphere'
  | 'Trimesh'
export type BodyShapeType = ShapeType | 'Compound'

export type CylinderArgs = [radiusTop?: number, radiusBottom?: number, height?: number, numSegments?: number]
export type SphereArgs = [radius: number]
export type TrimeshArgs = [vertices: ArrayLike<number>, indices: ArrayLike<number>]
export type HeightfieldArgs = [
  data: number[][],
  options: { elementSize?: number; maxValue?: number; minValue?: number },
]
export type ConvexPolyhedronArgs<V extends VectorTypes = VectorTypes> = [
  vertices?: V[],
  faces?: number[][],
  normals?: V[],
  axes?: V[],
  boundingSphereRadius?: number,
]

export type PlaneProps = BodyProps
export type BoxProps = BodyProps<Triplet>
export type CylinderProps = BodyProps<CylinderArgs>
export type ParticleProps = BodyProps
export type SphereProps = BodyProps<SphereArgs>
export type TrimeshProps = BodyPropsArgsRequired<TrimeshArgs>
export type HeightfieldProps = BodyPropsArgsRequired<HeightfieldArgs>
export type ConvexPolyhedronProps = BodyProps<ConvexPolyhedronArgs>
export interface CompoundBodyProps extends BodyProps {
  shapes: BodyProps & { type: ShapeType }[]
}

export type AtomicApi<K extends AtomicName> = {
  set: (value: AtomicProps[K]) => void
  subscribe: (callback: (value: AtomicProps[K]) => void) => () => void
}

export type QuaternionApi = {
  copy: ({ w, x, y, z }: Quaternion) => void
  set: (x: number, y: number, z: number, w: number) => void
  subscribe: (callback: (value: Quad) => void) => () => void
}

export type VectorApi = {
  copy: ({ x, y, z }: Vector3 | Euler) => void
  set: (x: number, y: number, z: number) => void
  subscribe: (callback: (value: Triplet) => void) => () => void
}

export type WorkerApi = {
  [K in AtomicName]: AtomicApi<K>
} & {
  [K in VectorName]: VectorApi
} & {
  applyForce: (force: Triplet, worldPoint: Triplet) => void
  applyImpulse: (impulse: Triplet, worldPoint: Triplet) => void
  applyLocalForce: (force: Triplet, localPoint: Triplet) => void
  applyLocalImpulse: (impulse: Triplet, localPoint: Triplet) => void
  applyTorque: (torque: Triplet) => void
  quaternion: QuaternionApi
  rotation: VectorApi
  sleep: () => void
  wakeUp: () => void
}

function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
}

const e = new Euler()
const q = new Quaternion()

const quaternionToRotation = (callback: (v: Triplet) => void) => {
  return (v: Quad) => callback(e.setFromQuaternion(q.fromArray(v)).toArray() as Triplet)
}

let incrementingId = 0

export class BodyApi implements WorkerApi {
  _uuid!: string
  get uuid(): string {
    return this._uuid
  }

  _world!: World

  allowSleep = this.makeAtomic('allowSleep')
  angularDamping = this.makeAtomic('angularDamping')
  angularFactor = this.makeVec('angularFactor')
  angularVelocity = this.makeVec('angularVelocity')
  collisionFilterGroup = this.makeAtomic('collisionFilterGroup')
  collisionFilterMask = this.makeAtomic('collisionFilterMask')
  collisionResponse = this.makeAtomic('collisionResponse')
  fixedRotation = this.makeAtomic('fixedRotation')
  isTrigger = this.makeAtomic('isTrigger')
  linearDamping = this.makeAtomic('linearDamping')
  linearFactor = this.makeVec('linearFactor')
  mass = this.makeAtomic('mass')
  material = this.makeAtomic('material')
  position = this.makeVec('position')
  quaternion = this.makeQuaternion()
  rotation = this.makeRotation()
  sleepSpeedLimit = this.makeAtomic('sleepSpeedLimit')
  sleepTimeLimit = this.makeAtomic('sleepTimeLimit')
  userData = this.makeAtomic('userData')
  velocity = this.makeVec('velocity')

  applyForce = (force: Triplet, worldPoint: Triplet) => {
    this.uuid && this._world.worker.applyForce({ props: [force, worldPoint], uuid: this.uuid })
  }

  applyImpulse = (impulse: Triplet, worldPoint: Triplet) => {
    this.uuid && this._world.worker.applyImpulse({ props: [impulse, worldPoint], uuid: this.uuid })
  }

  applyLocalForce = (force: Triplet, localPoint: Triplet) => {
    this.uuid && this._world.worker.applyLocalForce({ props: [force, localPoint], uuid: this.uuid })
  }

  applyLocalImpulse = (impulse: Triplet, localPoint: Triplet) => {
    this.uuid && this._world.worker.applyLocalImpulse({ props: [impulse, localPoint], uuid: this.uuid })
  }

  applyTorque = (torque: Triplet) => {
    this.uuid && this._world.worker.applyTorque({ props: [torque], uuid: this.uuid })
  }

  sleep = () => {
    this.uuid && this._world.worker.sleep({ uuid: this.uuid })
  }

  wakeUp = () => {
    this.uuid && this._world.worker.wakeUp({ uuid: this.uuid })
  }

  private makeAtomic<T extends AtomicName>(type: T) {
    const op: SetOpName<T> = `set${capitalize(type)}`

    return {
      set: (value: PropValue<T>) => {
        this.uuid &&
          this._world.worker[op]({
            props: value,
            uuid: this.uuid,
          } as never)
      },
      subscribe: this.subscribe(type),
    }
  }

  private makeQuaternion() {
    const type = 'quaternion'
    return {
      copy: ({ w, x, y, z }: Quaternion) => {
        this.uuid && this._world.worker.setQuaternion({ props: [x, y, z, w], uuid: this.uuid })
      },
      set: (x: number, y: number, z: number, w: number) => {
        this.uuid && this._world.worker.setQuaternion({ props: [x, y, z, w], uuid: this.uuid })
      },
      subscribe: this.subscribe(type),
    }
  }

  private makeRotation() {
    return {
      copy: ({ x, y, z }: Vector3 | Euler) => {
        this.uuid && this._world.worker.setRotation({ props: [x, y, z], uuid: this.uuid })
      },
      set: (x: number, y: number, z: number) => {
        this.uuid && this._world.worker.setRotation({ props: [x, y, z], uuid: this.uuid })
      },
      subscribe: (callback: (value: Triplet) => void) => {
        const id = incrementingId++
        const target = 'bodies'
        const type = 'quaternion'

        this._world.subscriptions[id] = { [type]: quaternionToRotation(callback) }
        this.uuid && this._world.worker.subscribe({ props: { id, target, type }, uuid: this.uuid })
        return () => {
          delete this._world.subscriptions[id]
          this._world.worker.unsubscribe({ props: id })
        }
      },
    }
  }

  private makeVec(type: VectorName) {
    const op: SetOpName<VectorName> = `set${capitalize(type)}`
    return {
      copy: ({ x, y, z }: Vector3 | Euler) => {
        this.uuid && this._world.worker[op]({ props: [x, y, z], uuid: this.uuid })
      },
      set: (x: number, y: number, z: number) => {
        this.uuid && this._world.worker[op]({ props: [x, y, z], uuid: this.uuid })
      },
      subscribe: this.subscribe(type),
    }
  }

  private subscribe<T extends SubscriptionName>(type: T, target: SubscriptionTarget = 'bodies') {
    return (callback: (value: PropValue<T>) => void) => {
      const id = Object.values(this._world.subscriptions).length
      this._world.subscriptions[id] = { [type]: callback }
      this.uuid && this._world.worker.subscribe({ props: { id, target, type }, uuid: this.uuid })
      return () => {
        delete this._world.subscriptions[id]
        this._world.worker.unsubscribe({ props: id })
      }
    }
  }
}
