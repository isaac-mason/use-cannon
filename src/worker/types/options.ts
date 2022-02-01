import type { MaterialOptions, RayOptions as RayOptionsImpl } from 'cannon-es'
import type { Vector3 } from 'three'


import type { CollideBeginEvent, CollideEndEvent, CollideEvent } from './operations'
import type { Quad, Triplet, VectorName } from './types'

export type AtomicProps = {
  allowSleep: boolean
  angularDamping: number
  collisionFilterGroup: number
  collisionFilterMask: number
  collisionResponse: number
  fixedRotation: boolean
  isTrigger: boolean
  linearDamping: number
  mass: number
  material: MaterialOptions
  sleepSpeedLimit: number
  sleepTimeLimit: number
  userData: {}
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

export type ConstraintTypes = 'PointToPoint' | 'ConeTwist' | 'Distance' | 'Lock'

export interface ConstraintOptns {
  collideConnected?: boolean
  maxForce?: number
  maxMultiplier?: number
  wakeUpBodies?: boolean
}

export interface PointToPointConstraintOpts extends ConstraintOptns {
  pivotA: Triplet
  pivotB: Triplet
}

export interface ConeTwistConstraintOpts extends ConstraintOptns {
  angle?: number
  axisA?: Triplet
  axisB?: Triplet
  pivotA?: Triplet
  pivotB?: Triplet
  twistAngle?: number
}
export interface DistanceConstraintOpts extends ConstraintOptns {
  distance?: number
}

export interface HingeConstraintOpts extends ConstraintOptns {
  axisA?: Triplet
  axisB?: Triplet
  pivotA?: Triplet
  pivotB?: Triplet
}

export type LockConstraintOpts = ConstraintOptns

export interface SpringOptns {
  damping?: number
  localAnchorA?: Triplet
  localAnchorB?: Triplet
  restLength?: number
  stiffness?: number
  worldAnchorA?: Triplet
  worldAnchorB?: Triplet
}

export type RayMode = 'Closest' | 'Any' | 'All'

export type RayOptions = {
  from?: Triplet
  mode: RayMode
  to?: Triplet
} & Pick<
  RayOptionsImpl,
  'checkCollisionResponse' | 'collisionFilterGroup' | 'collisionFilterMask' | 'skipBackfaces'
>

export interface WheelInfoOptions {
  axleLocal?: Triplet
  chassisConnectionPointLocal?: Triplet
  customSlidingRotationalSpeed?: number
  dampingCompression?: number
  dampingRelaxation?: number
  directionLocal?: Triplet
  frictionSlip?: number
  isFrontWheel?: boolean
  maxSuspensionForce?: number
  maxSuspensionTravel?: number
  radius?: number
  rollInfluence?: number
  sideAcceleration?: number
  suspensionRestLength?: number
  suspensionStiffness?: number
  useCustomSlidingRotationalSpeed?: boolean
}
