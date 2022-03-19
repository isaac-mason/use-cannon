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
  WheelInfoOptions,
  WorkerApi,
} from '@pmndrs/cannon-worker-api'
import { BodyApi } from '@pmndrs/cannon-worker-api'
import type { DependencyList, MutableRefObject, Ref, RefObject } from 'react'
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { InstancedMesh, MathUtils, Object3D, Vector3 } from 'three'

import { context } from './setup'

export interface PublicApi extends WorkerApi {
  at: (index: number) => WorkerApi
}

export type Api = [RefObject<Object3D>, PublicApi]

function useForwardedRef<T>(ref: Ref<T>): MutableRefObject<T | null> {
  const nullRef = useRef<T>(null)
  return ref && typeof ref !== 'function' ? ref : nullRef
}

function getUUID(ref: Ref<Object3D>, index?: number): string | null {
  const suffix = index === undefined ? '' : `/${index}`
  if (typeof ref === 'function') return null
  return ref && ref.current && `${ref.current.uuid}${suffix}`
}

type GetByIndex<T extends BodyProps> = (index: number) => T
type ArgFn<T> = (args: T) => unknown[]

class HookBodyApi extends BodyApi {
  private apiCache: { [index: number]: BodyApi } = {}

  at = (index: number) => {
    let api = this.apiCache[index]
    if (api) {
      return api
    }

    api = new HookInstanceBodyApi(this, index)
    api._world = this._world
    this.apiCache[index] = api
    return api
  }
}

class HookInstanceBodyApi extends BodyApi {
  private index: number
  private parent: HookBodyApi

  get uuid(): string {
    return `${this.parent.uuid}/${this.index}`
  }

  constructor(parent: HookBodyApi, index: number) {
    super()
    this.index = index
    this.parent = parent
  }
}

function useBody<B extends BodyProps<unknown[]>>(
  type: BodyShapeType,
  fn: GetByIndex<B>,
  argsFn: ArgFn<B['args']>,
  fwdRef: Ref<Object3D>,
  deps: DependencyList = [],
): Api {
  const ref = useForwardedRef(fwdRef)
  const { world } = useContext(context)

  useLayoutEffect(() => {
    const object = ref.current

    const props: (B & { args: unknown })[] =
      object instanceof InstancedMesh
        ? new Array(object.count).fill(0).map((_, i) => {
            const bodyProps = fn(i)
            return { ...bodyProps, args: argsFn(bodyProps.args) }
          })
        : [
            (() => {
              const bodyProps = fn(0)
              return { ...bodyProps, args: argsFn(bodyProps.args) }
            })(),
          ]

    const {
      uuid,
      object: { uuid: objectUUID },
    } = world.createBodies(type, props, object)

    api._uuid = objectUUID

    return () => {
      world.removeBodies(uuid)
    }
  }, deps)

  const api = new HookBodyApi()
  api._world = world

  return [ref, api]
}

function makeTriplet(v: Vector3 | Triplet): Triplet {
  return v instanceof Vector3 ? [v.x, v.y, v.z] : v
}

export function usePlane(fn: GetByIndex<PlaneProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
  return useBody('Plane', fn, () => [], fwdRef, deps)
}
export function useBox(fn: GetByIndex<BoxProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
  const defaultBoxArgs: Triplet = [1, 1, 1]
  return useBody('Box', fn, (args = defaultBoxArgs): Triplet => args, fwdRef, deps)
}
export function useCylinder(
  fn: GetByIndex<CylinderProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Cylinder', fn, (args = [] as []) => args, fwdRef, deps)
}
export function useHeightfield(
  fn: GetByIndex<HeightfieldProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Heightfield', fn, (args) => args, fwdRef, deps)
}
export function useParticle(
  fn: GetByIndex<ParticleProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Particle', fn, () => [], fwdRef, deps)
}
export function useSphere(fn: GetByIndex<SphereProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
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
export function useTrimesh(
  fn: GetByIndex<TrimeshProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody<TrimeshProps>('Trimesh', fn, (args) => args, fwdRef, deps)
}

export function useConvexPolyhedron(
  fn: GetByIndex<ConvexPolyhedronProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody<ConvexPolyhedronProps>(
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
export function useCompoundBody(
  fn: GetByIndex<CompoundBodyProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Compound', fn, (args) => args as unknown[], fwdRef, deps)
}

type ConstraintApi = [
  RefObject<Object3D>,
  RefObject<Object3D>,
  {
    disable: () => void
    enable: () => void
  },
]

type HingeConstraintApi = [
  RefObject<Object3D>,
  RefObject<Object3D>,
  {
    disable: () => void
    disableMotor: () => void
    enable: () => void
    enableMotor: () => void
    setMotorMaxForce: (value: number) => void
    setMotorSpeed: (value: number) => void
  },
]

type SpringApi = [
  RefObject<Object3D>,
  RefObject<Object3D>,
  {
    setDamping: (value: number) => void
    setRestLength: (value: number) => void
    setStiffness: (value: number) => void
  },
]

type ConstraintORHingeApi<T extends 'Hinge' | ConstraintTypes> = T extends ConstraintTypes
  ? ConstraintApi
  : HingeConstraintApi

function useConstraint<T extends 'Hinge' | ConstraintTypes>(
  type: T,
  bodyA: Ref<Object3D>,
  bodyB: Ref<Object3D>,
  optns: ConstraintOptns | HingeConstraintOpts = {},
  deps: DependencyList = [],
): ConstraintORHingeApi<T> {
  const { worker } = useContext(context)
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

  return [refA, refB, api] as ConstraintORHingeApi<T>
}

export function usePointToPointConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: PointToPointConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('PointToPoint', bodyA, bodyB, optns, deps)
}
export function useConeTwistConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: ConeTwistConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('ConeTwist', bodyA, bodyB, optns, deps)
}
export function useDistanceConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: DistanceConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Distance', bodyA, bodyB, optns, deps)
}
export function useHingeConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: HingeConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Hinge', bodyA, bodyB, optns, deps)
}
export function useLockConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: LockConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Lock', bodyA, bodyB, optns, deps)
}

export function useSpring(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: SpringOptns,
  deps: DependencyList = [],
): SpringApi {
  const { worker } = useContext(context)
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
  const { worker, world } = useContext(context)
  const [uuid] = useState(() => MathUtils.generateUUID())
  useEffect(() => {
    world.events[uuid] = { rayhit: callback }
    worker.addRay({ props: { ...options, mode }, uuid })
    return () => {
      worker.removeRay({ uuid })
      delete world.events[uuid]
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

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

export interface RaycastVehicleProps {
  chassisBody: Ref<Object3D>
  indexForwardAxis?: number
  indexRightAxis?: number
  indexUpAxis?: number
  wheelInfos: WheelInfoOptions[]
  wheels: Ref<Object3D>[]
}

export function useRaycastVehicle(
  fn: () => RaycastVehicleProps,
  fwdRef: Ref<Object3D> = null,
  deps: DependencyList = [],
): [RefObject<Object3D>, RaycastVehiclePublicApi] {
  const ref = useForwardedRef(fwdRef)
  const { worker, world } = useContext(context)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new Object3D()
    }

    const currentWorker = worker
    const uuid: string = ref.current.uuid
    const {
      chassisBody,
      indexForwardAxis = 2,
      indexRightAxis = 0,
      indexUpAxis = 1,
      wheelInfos,
      wheels,
    } = fn()

    const chassisBodyUUID = getUUID(chassisBody)
    const wheelUUIDs = wheels.map((ref) => getUUID(ref))

    if (!chassisBodyUUID || !wheelUUIDs.every(isString)) return

    currentWorker.addRaycastVehicle({
      props: [chassisBodyUUID, wheelUUIDs, wheelInfos, indexForwardAxis, indexRightAxis, indexUpAxis],
      uuid,
    })
    return () => {
      currentWorker.removeRaycastVehicle({ uuid })
    }
  }, deps)

  const api = useMemo<RaycastVehiclePublicApi>(() => {
    return {
      applyEngineForce(value: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid &&
          worker.applyRaycastVehicleEngineForce({
            props: [value, wheelIndex],
            uuid,
          })
      },
      setBrake(brake: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid && worker.setRaycastVehicleBrake({ props: [brake, wheelIndex], uuid })
      },
      setSteeringValue(value: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid &&
          worker.setRaycastVehicleSteeringValue({
            props: [value, wheelIndex],
            uuid,
          })
      },
      sliding: {
        subscribe: world.subscribe(ref.current || undefined, 'sliding', undefined, 'vehicles'),
      },
    }
  }, deps)
  return [ref, api]
}

export function useContactMaterial(
  materialA: MaterialOptions,
  materialB: MaterialOptions,
  options: ContactMaterialOptions,
  deps: DependencyList = [],
): void {
  const { worker } = useContext(context)
  const [uuid] = useState(() => MathUtils.generateUUID())

  useEffect(() => {
    worker.addContactMaterial({
      props: [materialA, materialB, options],
      uuid,
    })
    return () => {
      worker.removeContactMaterial({ uuid })
    }
  }, deps)
}
