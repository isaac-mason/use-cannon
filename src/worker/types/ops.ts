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
} from './props'
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

type Operation<T extends string> = { op: T }
export type WithProps<T, P> = T & { props: P }
export type WithUUID<T extends { op: string }> = T & { uuid: string }
export type WithUUIDs<T extends { op: string }> = T & { uuid: string[] }

export type AddConstraintMessage = WithUUID<
  WithProps<Operation<'addConstraint'>, [uuidA: string, uuidB: string, options: {}]>
> & {
  type: 'Hinge' | ConstraintTypes
}

export type DisableConstraintMessage = WithUUID<Operation<'disableConstraint'>>
export type EnableConstraintMessage = WithUUID<Operation<'enableConstraint'>>
export type RemoveConstraintMessage = WithUUID<Operation<'removeConstraint'>>

type ConstraintMessage =
  | AddConstraintMessage
  | DisableConstraintMessage
  | EnableConstraintMessage
  | RemoveConstraintMessage

export type DisableConstraintMotorMessage = WithUUID<Operation<'disableConstraintMotor'>>
export type EnableConstraintMotorMessage = WithUUID<Operation<'enableConstraintMotor'>>
export type SetConstraintMotorMaxForce = WithUUID<WithProps<Operation<'setConstraintMotorMaxForce'>, number>>
export type SetConstraintMotorSpeed = WithUUID<WithProps<Operation<'setConstraintMotorSpeed'>, number>>

type ConstraintMotorMessage =
  | DisableConstraintMotorMessage
  | EnableConstraintMotorMessage
  | SetConstraintMotorSpeed
  | SetConstraintMotorMaxForce

export type AddSpringMessage = WithUUID<
  WithProps<Operation<'addSpring'>, [uuidA: string, uuidB: string, options: SpringOptns]>
>
export type RemoveSpringMessage = WithUUID<Operation<'removeSpring'>>

export type SetSpringDampingMessage = WithUUID<WithProps<Operation<'setSpringDamping'>, number>>
export type SetSpringRestLengthMessage = WithUUID<WithProps<Operation<'setSpringRestLength'>, number>>
export type SetSpringStiffnessMessage = WithUUID<WithProps<Operation<'setSpringStiffness'>, number>>

type SpringMessage =
  | AddSpringMessage
  | RemoveSpringMessage
  | SetSpringDampingMessage
  | SetSpringRestLengthMessage
  | SetSpringStiffnessMessage

export type AddContactMaterialMessage = WithUUID<
  WithProps<
    Operation<'addContactMaterial'>,
    [materialA: MaterialOptions, materialB: MaterialOptions, options: ContactMaterialOptions]
  >
>
export type RemoveContactMaterialMessage = WithUUID<Operation<'removeContactMaterial'>>
type ContactMaterialMessage = AddContactMaterialMessage | RemoveContactMaterialMessage

export type AddRayMessage = WithUUID<
  WithProps<
    Operation<'addRay'>,
    {
      mode: RayMode
    } & RayOptions
  >
>
export type RemoveRayMessage = WithUUID<Operation<'removeRay'>>

type RayMessage = AddRayMessage | RemoveRayMessage

export type AddRaycastVehicleMessage = WithUUIDs<
  WithProps<
    Operation<'addRaycastVehicle'>,
    [
      chassisBodyUUID: string,
      wheelsUUID: string[],
      wheelInfos: WheelInfoOptions[],
      indexForwardAxis: number,
      indexRightAxis: number,
      indexUpAxis: number,
    ]
  >
>
export type RemoveRaycastVehicleMessage = WithUUIDs<Operation<'removeRaycastVehicle'>>

export type ApplyRaycastVehicleEngineForceMessage = WithUUID<
  WithProps<Operation<'applyRaycastVehicleEngineForce'>, [value: number, wheelIndex: number]>
>
export type SetRaycastVehicleBrakeMessage = WithUUID<
  WithProps<Operation<'setRaycastVehicleBrake'>, [brake: number, wheelIndex: number]>
>
export type SetRaycastVehicleSteeringValueMessage = WithUUID<
  WithProps<Operation<'setRaycastVehicleSteeringValue'>, [value: number, wheelIndex: number]>
>

type RaycastVehicleMessage =
  | AddRaycastVehicleMessage
  | ApplyRaycastVehicleEngineForceMessage
  | RemoveRaycastVehicleMessage
  | SetRaycastVehicleBrakeMessage
  | SetRaycastVehicleSteeringValueMessage

export type AtomicMessage<T extends AtomicName | undefined = undefined> = WithUUID<
  WithProps<Operation<SetOpName<AtomicName>>, T extends AtomicName ? PropValue<T> : any>
>

export type VectorMessage = WithUUID<WithProps<Operation<SetOpName<VectorName>>, Triplet>>

export type RotationMessage = WithUUID<WithProps<Operation<SetOpName<'rotation'>>, Triplet>>
export type QuaternionMessage = WithUUID<WithProps<Operation<SetOpName<'quaternion'>>, Quad>>

export type ApplyForceMessage = WithUUID<
  WithProps<Operation<'applyForce'>, [force: Triplet, worldPoint: Triplet]>
>
export type ApplyImpulseMessage = WithUUID<
  WithProps<Operation<'applyImpulse'>, [impulse: Triplet, worldPoint: Triplet]>
>
export type ApplyLocalForceMessage = WithUUID<
  WithProps<Operation<'applyLocalForce'>, [force: Triplet, localPoint: Triplet]>
>
export type ApplyLocalImpulseMessage = WithUUID<
  WithProps<Operation<'applyLocalImpulse'>, [impulse: Triplet, localPoint: Triplet]>
>
export type ApplyTorque = WithUUID<WithProps<Operation<'applyTorque'>, [torque: Triplet]>>

export type ApplyMessage =
  | ApplyForceMessage
  | ApplyImpulseMessage
  | ApplyLocalForceMessage
  | ApplyLocalImpulseMessage
  | ApplyTorque

type SerializableBodyProps = {
  onCollide: boolean
}

export type AddBodiesMessage = WithUUIDs<WithProps<Operation<'addBodies'>, SerializableBodyProps[]>> & {
  type: BodyShapeType
}
export type RemoveBodiesMessage = WithUUIDs<Operation<'removeBodies'>>

export type BodiesMessage = AddBodiesMessage | RemoveBodiesMessage

export type SleepMessage = WithUUID<Operation<'sleep'>>
export type WakeUpMessage = WithUUID<Operation<'wakeUp'>>

export type InitMessage = WithProps<
  Operation<'init'>,
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

export type StepMessage = WithProps<
  Operation<'step'>,
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
  WithProps<
    Operation<'subscribe'>,
    {
      id: number
      target: SubscriptionTarget
      type: SubscriptionName
    }
  >
>
export type UnsubscribeMessage = WithProps<Operation<'unsubscribe'>, number>

export type SubscriptionMessage = SubscribeMessage | UnsubscribeMessage

export type WorldPropName = 'axisIndex' | 'broadphase' | 'gravity' | 'iterations' | 'tolerance'

type WorldMessage<T extends WorldPropName> = WithProps<
  Operation<SetOpName<T>>,
  Required<InitMessage['props'][T]>
>

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
