import type { BodyProps, BodyShapeType, CannonWorkerAPI, World } from '@pmndrs/cannon-worker-api'
import { createContext } from 'react'

export type {
  AtomicName,
  AtomicProps,
  BodyProps,
  BodyPropsArgsRequired,
  BodyShapeType,
  BoxProps,
  Broadphase,
  Buffers,
  CannonMessage,
  CannonMessageBody,
  CannonMessageMap,
  CannonMessageProps,
  CannonWebWorker,
  CollideBeginEvent,
  CollideEndEvent,
  CollideEvent,
  CompoundBodyProps,
  ConeTwistConstraintOpts,
  ConstraintOptns,
  ConstraintTypes,
  ConvexPolyhedronArgs,
  ConvexPolyhedronProps,
  CylinderArgs,
  CylinderProps,
  DistanceConstraintOpts,
  HeightfieldArgs,
  HeightfieldProps,
  HingeConstraintOpts,
  IncomingWorkerMessage,
  LockConstraintOpts,
  Observation,
  ParticleProps,
  PlaneProps,
  PointToPointConstraintOpts,
  PropValue,
  Quad,
  RayhitEvent,
  RayMode,
  RayOptions,
  Refs,
  SetOpName,
  ShapeType,
  Solver,
  SphereArgs,
  SphereProps,
  SpringOptns,
  StepProps,
  Subscription,
  SubscriptionName,
  Subscriptions,
  SubscriptionTarget,
  TrimeshArgs,
  TrimeshProps,
  Triplet,
  VectorName,
  VectorProps,
  WheelInfoOptions,
  WorkerCollideBeginEvent,
  WorkerCollideEndEvent,
  WorkerCollideEvent,
  WorkerEventMessage,
  WorkerFrameMessage,
  WorkerRayhitEvent,
  WorldPropName,
  WorldProps,
} from '@pmndrs/cannon-worker-api'

export type ProviderContext = {
  worker: CannonWorkerAPI
  world: World
}

export type DebugApi = {
  add(id: string, props: BodyProps, type: BodyShapeType): void
  remove(id: string): void
}

export const context = createContext<ProviderContext>({} as ProviderContext)
export const debugContext = createContext<DebugApi>(null!)
