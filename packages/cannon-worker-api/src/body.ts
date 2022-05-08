import type { MaterialOptions } from 'cannon-es'
import { Euler, Quaternion, Vector3 } from 'three'

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
  WorkerApi,
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

function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
}

const e = new Euler()
const q = new Quaternion()

const quaternionToRotation = (callback: (v: Triplet) => void) => {
  return (v: Quad) => callback(e.setFromQuaternion(q.fromArray(v)).toArray() as Triplet)
}

export class BodyApi implements WorkerApi {
  static idCounter = 0

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
  uuid!: string | (() => string)
  velocity = this.makeVec('velocity')
  world!: World

  applyForce = (force: Triplet, worldPoint: Triplet) => {
    this.uuid && this.world.worker.applyForce({ props: [force, worldPoint], uuid: this.getUUID() })
  }

  applyImpulse = (impulse: Triplet, worldPoint: Triplet) => {
    this.uuid && this.world.worker.applyImpulse({ props: [impulse, worldPoint], uuid: this.getUUID() })
  }

  applyLocalForce = (force: Triplet, localPoint: Triplet) => {
    this.uuid && this.world.worker.applyLocalForce({ props: [force, localPoint], uuid: this.getUUID() })
  }

  applyLocalImpulse = (impulse: Triplet, localPoint: Triplet) => {
    this.uuid && this.world.worker.applyLocalImpulse({ props: [impulse, localPoint], uuid: this.getUUID() })
  }

  applyTorque = (torque: Triplet) => {
    this.uuid && this.world.worker.applyTorque({ props: [torque], uuid: this.getUUID() })
  }

  getUUID = () => (typeof this.uuid === 'function' ? this.uuid() : this.uuid)

  scaleOverride = (scale: Triplet) => {
    if (this.uuid) {
      this.world.scaleOverrides[this.getUUID()] = new Vector3(...scale)
    }
  }

  sleep = () => {
    this.getUUID() && this.world.worker.sleep({ uuid: this.getUUID() })
  }

  wakeUp = () => {
    this.uuid && this.world.worker.wakeUp({ uuid: this.getUUID() })
  }

  private makeAtomic<T extends AtomicName>(type: T) {
    const op: SetOpName<T> = `set${capitalize(type)}`

    return {
      set: (value: PropValue<T>) => {
        this.uuid &&
          this.world.worker[op]({
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
        this.uuid && this.world.worker.setQuaternion({ props: [x, y, z, w], uuid: this.getUUID() })
      },
      set: (x: number, y: number, z: number, w: number) => {
        this.uuid && this.world.worker.setQuaternion({ props: [x, y, z, w], uuid: this.getUUID() })
      },
      subscribe: this.subscribe(type),
    }
  }

  private makeRotation() {
    return {
      copy: ({ x, y, z }: Vector3 | Euler) => {
        this.uuid && this.world.worker.setRotation({ props: [x, y, z], uuid: this.getUUID() })
      },
      set: (x: number, y: number, z: number) => {
        this.uuid && this.world.worker.setRotation({ props: [x, y, z], uuid: this.getUUID() })
      },
      subscribe: (callback: (value: Triplet) => void) => {
        const id = BodyApi.idCounter++
        const target = 'bodies'
        const type = 'quaternion'

        this.world.subscriptions[id] = { [type]: quaternionToRotation(callback) }
        this.uuid && this.world.worker.subscribe({ props: { id, target, type }, uuid: this.getUUID() })
        return () => {
          delete this.world.subscriptions[id]
          this.world.worker.unsubscribe({ props: id })
        }
      },
    }
  }

  private makeVec(type: VectorName) {
    const op: SetOpName<VectorName> = `set${capitalize(type)}`
    return {
      copy: ({ x, y, z }: Vector3 | Euler) => {
        this.uuid && this.world.worker[op]({ props: [x, y, z], uuid: this.getUUID() })
      },
      set: (x: number, y: number, z: number) => {
        this.uuid && this.world.worker[op]({ props: [x, y, z], uuid: this.getUUID() })
      },
      subscribe: this.subscribe(type),
    }
  }

  private subscribe<T extends SubscriptionName>(type: T, target: SubscriptionTarget = 'bodies') {
    return (callback: (value: PropValue<T>) => void) => {
      const id = Object.values(this.world.subscriptions).length
      this.world.subscriptions[id] = { [type]: callback }
      this.uuid && this.world.worker.subscribe({ props: { id, target, type }, uuid: this.getUUID() })
      return () => {
        delete this.world.subscriptions[id]
        this.world.worker.unsubscribe({ props: id })
      }
    }
  }
}

export class Box extends BodyApi {
  props: BoxProps

  type = 'Box' as ShapeType

  constructor(props: BoxProps = {}) {
    super()
    this.props = props
  }
}

export class ConvexPolyhedron extends BodyApi {
  props: ConvexPolyhedronProps

  type = 'ConvexPolyhedron' as ShapeType

  constructor(props: ConvexPolyhedronProps = {}) {
    super()
    this.props = props
  }
}

export class Cylinder extends BodyApi {
  props: CylinderProps

  type = 'Cylinder' as ShapeType

  constructor(props: CylinderProps = {}) {
    super()
    this.props = props
  }
}

export class Heightfield extends BodyApi {
  props: HeightfieldProps

  type = 'Heightfield' as ShapeType

  constructor(props: HeightfieldProps) {
    super()
    this.props = props
  }
}

export class Particle extends BodyApi {
  props: ParticleProps

  type = 'Particle' as ShapeType

  constructor(props: ParticleProps = {}) {
    super()
    this.props = props
  }
}

export class Plane extends BodyApi {
  props: PlaneProps

  type = 'Plane' as ShapeType

  constructor(props: PlaneProps = {}) {
    super()
    this.props = props
  }
}

export class Sphere extends BodyApi {
  props: SphereProps

  type = 'Sphere' as ShapeType

  constructor(props: SphereProps = {}) {
    super()
    this.props = props
  }
}

export class Trimesh extends BodyApi {
  props: TrimeshProps

  type = 'Trimesh' as ShapeType

  constructor(props: TrimeshProps) {
    super()
    this.props = props
  }
}

export type Shape = Trimesh | Sphere | Plane | Particle | Heightfield | Cylinder | ConvexPolyhedron | Box
