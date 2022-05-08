import type {
  BodyProps,
  BodyShapeType,
  BoxProps,
  CompoundBodyProps,
  ConeTwistConstraintOpts,
  ConstraintOptns,
  ConstraintTypes,
  ContactMaterialOptions,
  ConvexPolyhedronArgs,
  ConvexPolyhedronProps,
  CylinderProps,
  DistanceConstraintOpts,
  HeightfieldProps,
  HingeConstraintOpts,
  LockConstraintOpts,
  MaterialOptions,
  ParticleProps,
  PlaneProps,
  PointToPointConstraintOpts,
  RayhitEvent,
  RayMode,
  RayOptions,
  SphereArgs,
  SphereProps,
  SpringOptns,
  TrimeshProps,
  Triplet,
  // WheelInfoOptions,
  WorkerApi,
} from '@pmndrs/cannon-worker-api'
import { BodyApi, ContactMaterial } from '@pmndrs/cannon-worker-api'
import type { DependencyList, MutableRefObject, Ref, RefObject } from 'react'
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MathUtils, Object3D, Vector3 } from 'three'

import { physicsContext, usePhysicsContext } from './physics-context'

export interface PublicApi extends WorkerApi {
  at: (index: number) => WorkerApi
}
export type Api<O extends Object3D> = [RefObject<O>, PublicApi]

function useForwardedRef<T>(ref: Ref<T>): MutableRefObject<T | null> {
  const nullRef = useRef<T>(null)
  return ref && typeof ref !== 'function' ? ref : nullRef
}

// function getUUID(ref: Ref<Object3D>, index?: number): string | null {
//   const suffix = index === undefined ? '' : `/${index}`
//   if (typeof ref === 'function') return null
//   return ref && ref.current && `${ref.current.uuid}${suffix}`
// }

class HookBodyApi extends BodyApi {
  private apiCache: { [index: number]: BodyApi } = {}

  at = (index: number) => {
    let api = this.apiCache[index]
    if (api) {
      return api
    }

    api = new BodyApi()
    api.world = this.world
    api.uuid = () => `${this.getUUID()}/${index}`
    this.apiCache[index] = api
    return api
  }
}

type GetByIndex<T extends BodyProps> = (index: number) => T

type ArgFn<T> = (args: T) => unknown[]

function useBody<B extends BodyProps<unknown[]>, O extends Object3D>(
  type: BodyShapeType,
  fn: GetByIndex<B>,
  argsFn: ArgFn<B['args']>,
  fwdRef: Ref<O>,
  deps: DependencyList = [],
): Api<O> {
  const ref = useForwardedRef(fwdRef)
  const { world } = useContext(physicsContext)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new Object3D() as never
    }
    const object = ref.current

    const uuids = world.createBodies(type, fn as (idx?: number) => BodyProps<unknown[]>, object, argsFn)

    return () => {
      world.destroyBodies(uuids)
    }
  }, deps)

  const api = new HookBodyApi()
  api.world = world

  // uuid is set in useLayoutEffect
  api.uuid = () => (ref.current as Object3D).uuid

  return [ref, api]
}

function makeTriplet(v: Vector3 | Triplet): Triplet {
  return v instanceof Vector3 ? [v.x, v.y, v.z] : v
}

export function usePlane<O extends Object3D>(
  fn: GetByIndex<PlaneProps>,
  fwdRef: Ref<O> = null,
  deps?: DependencyList,
) {
  return useBody('Plane', fn, () => [], fwdRef, deps)
}
export function useBox<O extends Object3D>(
  fn: GetByIndex<BoxProps>,
  fwdRef: Ref<O> = null,
  deps?: DependencyList,
) {
  const defaultBoxArgs: Triplet = [1, 1, 1]
  return useBody('Box', fn, (args = defaultBoxArgs): Triplet => args, fwdRef, deps)
}
export function useCylinder<O extends Object3D>(
  fn: GetByIndex<CylinderProps>,
  fwdRef: Ref<O> = null,
  deps?: DependencyList,
) {
  return useBody('Cylinder', fn, (args = [] as []) => args, fwdRef, deps)
}
export function useHeightfield<O extends Object3D>(
  fn: GetByIndex<HeightfieldProps>,
  fwdRef: Ref<O> = null,
  deps?: DependencyList,
) {
  return useBody('Heightfield', fn, (args) => args, fwdRef, deps)
}
export function useParticle<O extends Object3D>(
  fn: GetByIndex<ParticleProps>,
  fwdRef: Ref<O> = null,
  deps?: DependencyList,
) {
  return useBody('Particle', fn, () => [], fwdRef, deps)
}
export function useSphere<O extends Object3D>(
  fn: GetByIndex<SphereProps>,
  fwdRef: Ref<O> = null,
  deps?: DependencyList,
) {
  return useBody(
    'Sphere',
    fn,
    (args: SphereArgs = [1]): SphereArgs => {
      if (!Array.isArray(args)) throw new Error('useSphere args must be an array')
      return [args[0]]
    },
    fwdRef,
    deps,
  )
}
export function useTrimesh<O extends Object3D>(
  fn: GetByIndex<TrimeshProps>,
  fwdRef: Ref<O> = null,
  deps?: DependencyList,
) {
  return useBody<TrimeshProps, O>('Trimesh', fn, (args) => args, fwdRef, deps)
}

export function useConvexPolyhedron<O extends Object3D>(
  fn: GetByIndex<ConvexPolyhedronProps>,
  fwdRef: Ref<O> = null,
  deps?: DependencyList,
) {
  return useBody<ConvexPolyhedronProps, O>(
    'ConvexPolyhedron',
    fn,
    ([vertices, faces, normals, axes, boundingSphereRadius] = []): ConvexPolyhedronArgs<Triplet> => [
      vertices && vertices.map(makeTriplet),
      faces,
      normals && normals.map(makeTriplet),
      axes && axes.map(makeTriplet),
      boundingSphereRadius,
    ],
    fwdRef,
    deps,
  )
}
export function useCompoundBody<O extends Object3D>(
  fn: GetByIndex<CompoundBodyProps>,
  fwdRef: Ref<O> = null,
  deps?: DependencyList,
) {
  return useBody('Compound', fn, (args) => args as unknown[], fwdRef, deps)
}

type ConstraintApi<A extends Object3D, B extends Object3D> = [
  RefObject<A>,
  RefObject<B>,
  {
    disable: () => void
    enable: () => void
  },
]

type HingeConstraintApi<A extends Object3D, B extends Object3D> = [
  RefObject<A>,
  RefObject<B>,
  {
    disable: () => void
    disableMotor: () => void
    enable: () => void
    enableMotor: () => void
    setMotorMaxForce: (value: number) => void
    setMotorSpeed: (value: number) => void
  },
]

type SpringApi<A extends Object3D, B extends Object3D> = [
  RefObject<A>,
  RefObject<B>,
  {
    setDamping: (value: number) => void
    setRestLength: (value: number) => void
    setStiffness: (value: number) => void
  },
]

type ConstraintORHingeApi<
  T extends 'Hinge' | ConstraintTypes,
  A extends Object3D,
  B extends Object3D,
> = T extends ConstraintTypes ? ConstraintApi<A, B> : HingeConstraintApi<A, B>

function useConstraint<T extends 'Hinge' | ConstraintTypes, A extends Object3D, B extends Object3D>(
  type: T,
  bodyA: Ref<A>,
  bodyB: Ref<B>,
  optns: ConstraintOptns | HingeConstraintOpts = {},
  deps: DependencyList = [],
): ConstraintORHingeApi<T, A, B> {
  const {
    world: { worker },
  } = usePhysicsContext()
  const uuid = MathUtils.generateUUID()

  const refA = useForwardedRef(bodyA)
  const refB = useForwardedRef(bodyB)

  useEffect(() => {
    if (refA.current && refB.current) {
      worker.addConstraint({
        props: [refA.current.uuid, refB.current.uuid, optns],
        type,
        uuid,
      })
      return () => worker.removeConstraint({ uuid })
    }
  }, deps)

  const api = useMemo(() => {
    const enableDisable = {
      disable: () => worker.disableConstraint({ uuid }),
      enable: () => worker.enableConstraint({ uuid }),
    }

    if (type === 'Hinge') {
      return {
        ...enableDisable,
        disableMotor: () => worker.disableConstraintMotor({ uuid }),
        enableMotor: () => worker.enableConstraintMotor({ uuid }),
        setMotorMaxForce: (value: number) => worker.setConstraintMotorMaxForce({ props: value, uuid }),
        setMotorSpeed: (value: number) => worker.setConstraintMotorSpeed({ props: value, uuid }),
      }
    }

    return enableDisable
  }, deps)

  return [refA, refB, api] as ConstraintORHingeApi<T, A, B>
}

export function usePointToPointConstraint<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: PointToPointConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('PointToPoint', bodyA, bodyB, optns, deps)
}
export function useConeTwistConstraint<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: ConeTwistConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('ConeTwist', bodyA, bodyB, optns, deps)
}
export function useDistanceConstraint<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: DistanceConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Distance', bodyA, bodyB, optns, deps)
}
export function useHingeConstraint<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: HingeConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Hinge', bodyA, bodyB, optns, deps)
}
export function useLockConstraint<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: LockConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Lock', bodyA, bodyB, optns, deps)
}

export function useSpring<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: SpringOptns,
  deps: DependencyList = [],
): SpringApi<A, B> {
  const {
    world: { worker },
  } = usePhysicsContext()
  const [uuid] = useState(() => MathUtils.generateUUID())

  const refA = useForwardedRef(bodyA)
  const refB = useForwardedRef(bodyB)

  useEffect(() => {
    if (refA.current && refB.current) {
      worker.addSpring({
        props: [refA.current.uuid, refB.current.uuid, optns],
        uuid,
      })
      return () => {
        worker.removeSpring({ uuid })
      }
    }
  }, deps)

  const api = useMemo(
    () => ({
      setDamping: (value: number) => worker.setSpringDamping({ props: value, uuid }),
      setRestLength: (value: number) => worker.setSpringRestLength({ props: value, uuid }),
      setStiffness: (value: number) => worker.setSpringStiffness({ props: value, uuid }),
    }),
    deps,
  )

  return [refA, refB, api]
}

function useRay(
  mode: RayMode,
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  const {
    world: { worker, events },
  } = usePhysicsContext()
  const [uuid] = useState(() => MathUtils.generateUUID())
  useEffect(() => {
    events[uuid] = { rayhit: callback }
    worker.addRay({ props: { ...options, mode }, uuid })
    return () => {
      worker.removeRay({ uuid })
      delete events[uuid]
    }
  }, deps)
}

export function useRaycastClosest(
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  useRay('Closest', options, callback, deps)
}

export function useRaycastAny(
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  useRay('Any', options, callback, deps)
}

export function useRaycastAll(
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  useRay('All', options, callback, deps)
}

export interface RaycastVehiclePublicApi {
  applyEngineForce: (value: number, wheelIndex: number) => void
  setBrake: (brake: number, wheelIndex: number) => void
  setSteeringValue: (value: number, wheelIndex: number) => void
  sliding: {
    subscribe: (callback: (sliding: boolean) => void) => void
  }
}

// function isString(v: unknown): v is string {
//   return typeof v === 'string'
// }

// export interface RaycastVehicleProps {
//   chassisBody: Ref<Object3D>
//   indexForwardAxis?: number
//   indexRightAxis?: number
//   indexUpAxis?: number
//   wheelInfos: WheelInfoOptions[]
//   wheels: Ref<Object3D>[]
// }

// export function useRaycastVehicle<O extends Object3D>(
//   fn: () => RaycastVehicleProps,
//   fwdRef: Ref<O> = null,
//   deps: DependencyList = [],
// ): [RefObject<O>, RaycastVehiclePublicApi] {
//   const ref = useForwardedRef(fwdRef)
//   const {
//     world: { worker, subscriptions },
//   } = usePhysicsContext()

//   useLayoutEffect(() => {
//     if (!ref.current) {
//       // When the reference isn't used we create a stub
//       // The body doesn't have a visual representation but can still be constrained
//       // Yes, this type may be technically incorrect
//       ref.current = new Object3D() as O
//     }

//     const currentWorker = worker
//     const uuid: string = ref.current.uuid
//     const {
//       chassisBody,
//       indexForwardAxis = 2,
//       indexRightAxis = 0,
//       indexUpAxis = 1,
//       wheelInfos,
//       wheels,
//     } = fn()

//     const chassisBodyUUID = getUUID(chassisBody)
//     const wheelUUIDs = wheels.map((ref) => getUUID(ref))

//     if (!chassisBodyUUID || !wheelUUIDs.every(isString)) return

//     currentWorker.addRaycastVehicle({
//       props: [chassisBodyUUID, wheelUUIDs, wheelInfos, indexForwardAxis, indexRightAxis, indexUpAxis],
//       uuid,
//     })
//     return () => {
//       currentWorker.removeRaycastVehicle({ uuid })
//     }
//   }, deps)

//   const api = useMemo<RaycastVehiclePublicApi>(() => {
//     return {
//       applyEngineForce(value: number, wheelIndex: number) {
//         const uuid = getUUID(ref)
//         uuid &&
//           worker.applyRaycastVehicleEngineForce({
//             props: [value, wheelIndex],
//             uuid,
//           })
//       },
//       setBrake(brake: number, wheelIndex: number) {
//         const uuid = getUUID(ref)
//         uuid && worker.setRaycastVehicleBrake({ props: [brake, wheelIndex], uuid })
//       },
//       setSteeringValue(value: number, wheelIndex: number) {
//         const uuid = getUUID(ref)
//         uuid &&
//           worker.setRaycastVehicleSteeringValue({
//             props: [value, wheelIndex],
//             uuid,
//           })
//       },
//       sliding: {
//         subscribe: subscribe(ref, worker, subscriptions, 'sliding', undefined, 'vehicles'),
//       },
//     }
//   }, deps)
//   return [ref, api]
// }

export function useContactMaterial(
  materialA: MaterialOptions,
  materialB: MaterialOptions,
  options: ContactMaterialOptions,
  deps: DependencyList = [],
): void {
  const { world } = usePhysicsContext()

  useEffect(() => {
    const material = new ContactMaterial(materialA, materialB, options)
    world.addContactMaterial(material)
    return () => {
      world.removeContactMaterial(material)
    }
  }, deps)
}
