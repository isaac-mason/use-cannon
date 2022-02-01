import type { ContactMaterial } from 'cannon-es'
import type { Object3D } from 'three'

export type Triplet = [x: number, y: number, z: number]
export type Quad = [x: number, y: number, z: number, w: number]

export type Broadphase = 'Naive' | 'SAP'
export type Solver = 'GS' | 'Split'

export type DefaultContactMaterial = Partial<
  Pick<
    ContactMaterial,
    | 'contactEquationRelaxation'
    | 'contactEquationStiffness'
    | 'friction'
    | 'frictionEquationRelaxation'
    | 'frictionEquationStiffness'
    | 'restitution'
  >
>

export type CannonWorkerApiProps = {
  allowSleep?: boolean
  axisIndex?: number
  broadphase?: Broadphase
  defaultContactMaterial?: DefaultContactMaterial
  gravity?: Triplet
  iterations?: number
  quatNormalizeFast?: boolean
  quatNormalizeSkip?: number
  size?: number
  solver?: Solver
  tolerance?: number
}

export type Buffers = { positions: Float32Array; quaternions: Float32Array }
export type Refs = { [uuid: string]: Object3D }

export const atomicNames = [
  'allowSleep',
  'angularDamping',
  'collisionFilterGroup',
  'collisionFilterMask',
  'collisionResponse',
  'fixedRotation',
  'isTrigger',
  'linearDamping',
  'mass',
  'material',
  'sleepSpeedLimit',
  'sleepTimeLimit',
  'userData',
] as const
export type AtomicName = typeof atomicNames[number]

export const vectorNames = [
  'angularFactor',
  'angularVelocity',
  'linearFactor',
  'position',
  'velocity',
] as const
export type VectorName = typeof vectorNames[number]
