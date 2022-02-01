import type { ContactMaterialOptions, MaterialOptions, Shape } from 'cannon-es'
import type { Object3D } from 'three'


import type {
  AtomicProps,
  BodyShapeType,
  ConstraintTypes,
  RayMode,
  RayOptions,
  SpringOptns,
  WheelInfoOptions,
} from './options'
import type {
  AtomicName,
  Broadphase,
  Buffers,
  DefaultContactMaterial,
  Quad,
  Solver,
  Triplet,
  VectorName,
} from './types'
import { atomicNames, vectorNames } from './types'

type WorkerContact = WorkerCollideEvent['data']['contact']
export type CollideEvent = Omit<WorkerCollideEvent['data'], 'body' | 'target' | 'contact'> & {
  body: Object3D
  contact: Omit<WorkerContact, 'bi' | 'bj'> & {
    bi: Object3D
    bj: Object3D
  }
  target: Object3D
}
export type CollideBeginEvent = {
  body: Object3D
  op: 'event'
  target: Object3D
  type: 'collideBegin'
}
export type CollideEndEvent = {
  body: Object3D
  op: 'event'
  target: Object3D
  type: 'collideEnd'
}
export type RayhitEvent = Omit<WorkerRayhitEvent['data'], 'body'> & { body: Object3D | null }

type CannonEvent = CollideBeginEvent | CollideEndEvent | CollideEvent | RayhitEvent
type CallbackByType<T extends { type: string }> = {
  [K in T['type']]?: T extends { type: K } ? (e: T) => void : never
}

export type CannonEvents = { [uuid: string]: Partial<CallbackByType<CannonEvent>> }

export type Subscription = Partial<{ [K in SubscriptionName]: (value: PropValue<K>) => void }>
export type Subscriptions = Partial<{
  [id: number]: Subscription
}>

export type PropValue<T extends SubscriptionName = SubscriptionName> = T extends AtomicName
  ? AtomicProps[T]
  : T extends VectorName
  ? Triplet
  : T extends 'quaternion'
  ? Quad
  : T extends 'sliding'
  ? boolean
  : never

export const subscriptionNames = [...atomicNames, ...vectorNames, 'quaternion', 'sliding'] as const
export type SubscriptionName = typeof subscriptionNames[number]

export type SetOpName<T extends AtomicName | VectorName | WorldPropName | 'quaternion' | 'rotation'> =
  `set${Capitalize<T>}`

type Operation<T extends string, P> = { op: T } & (P extends void ? {} : { props: P })
export type WithUUID<T extends string, P = void> = Operation<T, P> & { uuid: string }
type WithUUIDs<T extends string, P = void> = Operation<T, P> & { uuid: string[] }

export type AddConstraintMessage = WithUUID<'addConstraint', [uuidA: string, uuidB: string, options: {}]> & {
  type: 'Hinge' | ConstraintTypes
}

export type DisableConstraintMessage = WithUUID<'disableConstraint'>
export type EnableConstraintMessage = WithUUID<'enableConstraint'>
export type RemoveConstraintMessage = WithUUID<'removeConstraint'>

type ConstraintMessage =
  | AddConstraintMessage
  | DisableConstraintMessage
  | EnableConstraintMessage
  | RemoveConstraintMessage

export type DisableConstraintMotorMessage = WithUUID<'disableConstraintMotor'>
export type EnableConstraintMotorMessage = WithUUID<'enableConstraintMotor'>
export type SetConstraintMotorMaxForce = WithUUID<'setConstraintMotorMaxForce', number>
export type SetConstraintMotorSpeed = WithUUID<'setConstraintMotorSpeed', number>

type ConstraintMotorMessage =
  | DisableConstraintMotorMessage
  | EnableConstraintMotorMessage
  | SetConstraintMotorSpeed
  | SetConstraintMotorMaxForce

export type AddSpringMessage = WithUUID<'addSpring', [uuidA: string, uuidB: string, options: SpringOptns]>
export type RemoveSpringMessage = WithUUID<'removeSpring'>

export type SetSpringDampingMessage = WithUUID<'setSpringDamping', number>
export type SetSpringRestLengthMessage = WithUUID<'setSpringRestLength', number>
export type SetSpringStiffnessMessage = WithUUID<'setSpringStiffness', number>

type SpringMessage =
  | AddSpringMessage
  | RemoveSpringMessage
  | SetSpringDampingMessage
  | SetSpringRestLengthMessage
  | SetSpringStiffnessMessage

export type AddContactMaterialMessage = WithUUID<
  'addContactMaterial',
  [materialA: MaterialOptions, materialB: MaterialOptions, options: ContactMaterialOptions]
>
export type RemoveContactMaterialMessage = WithUUID<'removeContactMaterial'>
type ContactMaterialMessage = AddContactMaterialMessage | RemoveContactMaterialMessage

export type AddRayMessage = WithUUID<
  'addRay',
  {
    mode: RayMode
  } & RayOptions
>
export type RemoveRayMessage = WithUUID<'removeRay'>

type RayMessage = AddRayMessage | RemoveRayMessage

export type AddRaycastVehicleMessage = WithUUIDs<
  'addRaycastVehicle',
  [
    chassisBodyUUID: string,
    wheelsUUID: string[],
    wheelInfos: WheelInfoOptions[],
    indexForwardAxis: number,
    indexRightAxis: number,
    indexUpAxis: number,
  ]
>
export type RemoveRaycastVehicleMessage = WithUUIDs<'removeRaycastVehicle'>

export type ApplyRaycastVehicleEngineForceMessage = WithUUID<
  'applyRaycastVehicleEngineForce',
  [value: number, wheelIndex: number]
>
export type SetRaycastVehicleBrakeMessage = WithUUID<
  'setRaycastVehicleBrake',
  [brake: number, wheelIndex: number]
>
export type SetRaycastVehicleSteeringValueMessage = WithUUID<
  'setRaycastVehicleSteeringValue',
  [value: number, wheelIndex: number]
>

type RaycastVehicleMessage =
  | AddRaycastVehicleMessage
  | ApplyRaycastVehicleEngineForceMessage
  | RemoveRaycastVehicleMessage
  | SetRaycastVehicleBrakeMessage
  | SetRaycastVehicleSteeringValueMessage

export type AtomicMessage = WithUUID<SetOpName<AtomicName>, any>

export type VectorMessage = WithUUID<SetOpName<VectorName>, Triplet>

export type RotationMessage = WithUUID<SetOpName<'rotation'>, Triplet>
export type QuaternionMessage = WithUUID<SetOpName<'quaternion'>, Quad>

export type ApplyForceMessage = WithUUID<'applyForce', [force: Triplet, worldPoint: Triplet]>
export type ApplyImpulseMessage = WithUUID<'applyImpulse', [impulse: Triplet, worldPoint: Triplet]>
export type ApplyLocalForceMessage = WithUUID<'applyLocalForce', [force: Triplet, localPoint: Triplet]>
export type ApplyLocalImpulseMessage = WithUUID<'applyLocalImpulse', [impulse: Triplet, localPoint: Triplet]>
export type ApplyTorque = WithUUID<'applyTorque', [torque: Triplet]>

export type ApplyMessage =
  | ApplyForceMessage
  | ApplyImpulseMessage
  | ApplyLocalForceMessage
  | ApplyLocalImpulseMessage
  | ApplyTorque

type SerializableBodyProps = {
  onCollide: boolean
}

export type AddBodiesMessage = WithUUIDs<'addBodies', SerializableBodyProps[]> & { type: BodyShapeType }
export type RemoveBodiesMessage = WithUUIDs<'removeBodies'>

export type BodiesMessage = AddBodiesMessage | RemoveBodiesMessage

export type SleepMessage = WithUUID<'sleep'>
export type WakeUpMessage = WithUUID<'wakeUp'>

export type InitMessage = Operation<
  'init',
  {
    allowSleep: boolean
    axisIndex: number
    broadphase: Broadphase
    defaultContactMaterial: DefaultContactMaterial
    gravity: Triplet
    iterations: number
    quatNormalizeFast: boolean
    quatNormalizeSkip: number
    solver: Solver
    tolerance: number
  }
>

export type StepMessage = Operation<
  'step',
  {
    dt?: number
    maxSubSteps?: number
    stepSize: number
  }
> & {
  positions: Float32Array
  quaternions: Float32Array
}

export type SubscriptionTarget = 'bodies' | 'vehicles'

export type SubscribeMessage = WithUUID<
  'subscribe',
  {
    id: number
    target: SubscriptionTarget
    type: SubscriptionName
  }
>
export type UnsubscribeMessage = Operation<'unsubscribe', number>

export type SubscriptionMessage = SubscribeMessage | UnsubscribeMessage

export type WorldPropName = 'axisIndex' | 'broadphase' | 'gravity' | 'iterations' | 'tolerance'

type WorldMessage<T extends WorldPropName> = Operation<SetOpName<T>, Required<InitMessage['props'][T]>>

export type CannonMessage =
  | ApplyMessage
  | AtomicMessage
  | BodiesMessage
  | ConstraintMessage
  | ConstraintMotorMessage
  | InitMessage
  | QuaternionMessage
  | RaycastVehicleMessage
  | RayMessage
  | RotationMessage
  | SleepMessage
  | SpringMessage
  | StepMessage
  | ContactMaterialMessage
  | SubscriptionMessage
  | VectorMessage
  | WakeUpMessage
  | WorldMessage<WorldPropName>
type Observation = { [K in AtomicName]: [id: number, value: PropValue<K>, type: K] }[AtomicName]

export type WorkerFrameMessage = {
  data: Buffers & {
    active: boolean
    bodies?: string[]
    observations: Observation[]
    op: 'frame'
  }
}

export type WorkerCollideEvent = {
  data: {
    body: string
    collisionFilters: {
      bodyFilterGroup: number
      bodyFilterMask: number
      targetFilterGroup: number
      targetFilterMask: number
    }
    contact: {
      bi: string
      bj: string
      /** Normal of the contact, relative to the colliding body */
      contactNormal: number[]
      /** Contact point in world space */
      contactPoint: number[]
      id: string
      impactVelocity: number
      ni: number[]
      ri: number[]
      rj: number[]
    }
    op: 'event'
    target: string
    type: 'collide'
  }
}

export type WorkerRayhitEvent = {
  data: {
    body: string | null
    distance: number
    hasHit: boolean
    hitFaceIndex: number
    hitNormalWorld: number[]
    hitPointWorld: number[]
    op: 'event'
    ray: {
      collisionFilterGroup: number
      collisionFilterMask: number
      direction: number[]
      from: number[]
      to: number[]
      uuid: string
    }
    rayFromWorld: number[]
    rayToWorld: number[]
    shape: (Omit<Shape, 'body'> & { body: string }) | null
    shouldStop: boolean
    type: 'rayhit'
  }
}
export type WorkerCollideBeginEvent = {
  data: {
    bodyA: string
    bodyB: string
    op: 'event'
    type: 'collideBegin'
  }
}
export type WorkerCollideEndEvent = {
  data: {
    bodyA: string
    bodyB: string
    op: 'event'
    type: 'collideEnd'
  }
}
type WorkerEventMessage =
  | WorkerCollideBeginEvent
  | WorkerCollideEndEvent
  | WorkerCollideEvent
  | WorkerRayhitEvent

export type IncomingWorkerMessage = WorkerEventMessage | WorkerFrameMessage

export interface CannonWorker {
  onmessage: (e: IncomingWorkerMessage) => void
  postMessage:
    | ((message: CannonMessage) => void)
    | ((message: CannonMessage, transferables?: Transferable[]) => void)
  terminate: () => void
}
