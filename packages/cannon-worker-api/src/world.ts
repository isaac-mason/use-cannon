import type { BodyProps, BodyShapeType } from 'body'
import { DynamicDrawUsage, InstancedMesh, Matrix4, Object3D, Quaternion, Vector3 } from 'three'

import type { CannonWorkerProps } from './cannon-worker-api'
import { CannonWorkerAPI } from './cannon-worker-api'
import type {
  Broadphase,
  CannonEvents,
  PropValue,
  Refs,
  SubscriptionName,
  Subscriptions,
  SubscriptionTarget,
  Triplet,
  WorkerCollideBeginEvent,
  WorkerCollideEndEvent,
  WorkerCollideEvent,
  WorkerFrameMessage,
  WorkerRayhitEvent,
} from './types'

const v = new Vector3()
const s = new Vector3(1, 1, 1)
const q = new Quaternion()
const m = new Matrix4()

function apply(index: number, positions: Float32Array, quaternions: Float32Array, object?: Object3D) {
  if (index !== undefined) {
    m.compose(
      v.fromArray(positions, index * 3),
      q.fromArray(quaternions, index * 4),
      object ? object.scale : s,
    )
    if (object) {
      object.matrixAutoUpdate = false
      object.matrix.copy(m)
    }
    return m
  }
  return m.identity()
}

function prepare(object: Object3D, props: BodyProps) {
  object.userData = props.userData || {}
  object.position.set(...(props.position || [0, 0, 0]))
  object.rotation.set(...(props.rotation || [0, 0, 0]))
  object.updateMatrix()
}

function getUUID(object?: Object3D, index?: number): string | null {
  const suffix = index === undefined ? '' : `/${index}`
  if (!object) return null
  return object && `${object.uuid}${suffix}`
}

const temp = new Object3D()

export class World {
  bodies: { [uuid: string]: number }
  events: CannonEvents
  refs: Refs
  subscriptions: Subscriptions
  worker: CannonWorkerAPI

  private incrementingId = 0

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
  }: CannonWorkerProps) {
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

    this.bodies = {}
    this.events = {}
    this.refs = {}
    this.subscriptions = {}

    const collideBeginHandler = ({ bodyA, bodyB }: WorkerCollideBeginEvent['data']) => {
      const cbA = this.events[bodyA]?.collideBegin
      cbA &&
        cbA({
          body: this.refs[bodyB],
          op: 'event',
          target: this.refs[bodyA],
          type: 'collideBegin',
        })
      const cbB = this.events[bodyB]?.collideBegin
      cbB &&
        cbB({
          body: this.refs[bodyA],
          op: 'event',
          target: this.refs[bodyB],
          type: 'collideBegin',
        })
    }

    const collideEndHandler = ({ bodyA, bodyB }: WorkerCollideEndEvent['data']) => {
      const cbA = this.events[bodyA]?.collideEnd
      cbA &&
        cbA({
          body: this.refs[bodyB],
          op: 'event',
          target: this.refs[bodyA],
          type: 'collideEnd',
        })
      const cbB = this.events[bodyB]?.collideEnd
      cbB &&
        cbB({
          body: this.refs[bodyA],
          op: 'event',
          target: this.refs[bodyB],
          type: 'collideEnd',
        })
    }

    const collideHandler = ({
      body,
      contact: { bi, bj, ...contactRest },
      target,
      ...rest
    }: WorkerCollideEvent['data']) => {
      const cb = this.events[target]?.collide
      cb &&
        cb({
          body: this.refs[body],
          contact: {
            bi: this.refs[bi],
            bj: this.refs[bj],
            ...contactRest,
          },
          target: this.refs[target],
          ...rest,
        })
    }

    const frameHandler = ({
      active,
      bodies: uuids = [],
      observations,
      positions,
      quaternions,
    }: WorkerFrameMessage['data']) => {
      for (let i = 0; i < uuids.length; i++) {
        this.bodies[uuids[i]] = i
      }

      observations.forEach(([id, value, type]) => {
        const subscription = this.subscriptions[id] || {}
        const cb = subscription[type]
        // HELP: We clearly know the type of the callback, but typescript can't deal with it
        cb && cb(value as never)
      })

      if (active) {
        for (const ref of Object.values(this.refs)) {
          if (ref instanceof InstancedMesh) {
            for (let i = 0; i < ref.count; i++) {
              const index = this.bodies[`${ref.uuid}/${i}`]
              if (index !== undefined) {
                ref.setMatrixAt(i, apply(index, positions, quaternions))
              }
              ref.instanceMatrix.needsUpdate = true
            }
          } else {
            apply(this.bodies[ref.uuid], positions, quaternions, ref)
          }
        }
        // if (shouldInvalidate) {
        //   invalidate()
        // }
      }
    }

    const rayhitHandler = ({ body, ray: { uuid, ...rayRest }, ...rest }: WorkerRayhitEvent['data']) => {
      const cb = this.events[uuid]?.rayhit
      cb &&
        cb({
          body: body ? this.refs[body] : null,
          ray: { uuid, ...rayRest },
          ...rest,
        })
    }

    this.worker.init()
    this.worker.on('collide', collideHandler)
    this.worker.on('collideBegin', collideBeginHandler)
    this.worker.on('collideEnd', collideEndHandler)
    this.worker.on('frame', frameHandler)
    this.worker.on('rayhit', rayhitHandler)
  }

  get axisIndex(): 0 | 1 | 2 {
    return this.worker.axisIndex
  }

  set axisIndex(value: 0 | 1 | 2) {
    this.worker.axisIndex = value
  }

  get broadphase(): Broadphase {
    return this.worker.broadphase
  }

  set broadphase(value: Broadphase) {
    this.worker.broadphase = value
  }

  get gravity(): Triplet {
    return this.worker.gravity
  }

  set gravity(value: Triplet) {
    this.worker.gravity = value
  }

  get iterations(): number {
    return this.worker.iterations
  }

  set iterations(value: number) {
    this.worker.iterations = value
  }

  get tolerance(): number {
    return this.worker.tolerance
  }

  set tolerance(value: number) {
    this.worker.tolerance = value
  }

  createBodies(
    type: BodyShapeType,
    props: BodyProps<unknown[]>[],
    bodyObject?: Object3D | InstancedMesh | null,
  ): { object: Object3D; uuid: string[] } {
    const object = bodyObject ? bodyObject : new Object3D()

    const objectCount =
      object instanceof InstancedMesh ? (object.instanceMatrix.setUsage(DynamicDrawUsage), object.count) : 1

    const uuid =
      object instanceof InstancedMesh
        ? new Array(objectCount).fill(0).map((_, i) => `${object.uuid}/${i}`)
        : [object.uuid]

    if (object instanceof InstancedMesh) {
      for (let i = 0; i < uuid.length; i++) {
        prepare(temp, props[i])
        object.setMatrixAt(i, temp.matrix)
        object.instanceMatrix.needsUpdate = true
        this.refs[uuid[i]] = object
        this.setupCollision(props[i], uuid[i])
        // todo - debug
      }
    } else {
      prepare(object, props[0])
      this.refs[uuid[0]] = object
      this.setupCollision(props[0], uuid[0])
      // todo - debug
    }

    console.log(props)
    this.worker.addBodies({
      props: props.map(({ onCollide, onCollideBegin, onCollideEnd, ...serializableProps }) => {
        return { onCollide: Boolean(onCollide), ...serializableProps }
      }),
      type,
      uuid,
    })

    return { object, uuid }
  }

  removeBodies(uuid: string[]): void {
    for (const id of uuid) {
      delete this.refs[id]
      delete this.events[id]
      // todo - debug
    }
    this.worker.removeBodies({ uuid })
  }

  step(dt: number, timeSinceLastCalled?: number, maxSubSteps?: number): void {
    this.worker.step({
      maxSubSteps,
      stepSize: dt,
      timeSinceLastCalled,
    })
  }

  subscribe<T extends SubscriptionName>(
    object: Object3D | undefined,
    type: T,
    index: number | undefined,
    target: SubscriptionTarget = 'bodies',
  ) {
    return (callback: (value: PropValue<T>) => void) => {
      const id = this.incrementingId++
      this.subscriptions[id] = { [type]: callback }
      const uuid = getUUID(object, index)
      uuid && this.worker.subscribe({ props: { id, target, type }, uuid })
      return () => {
        delete this.subscriptions[id]
        this.worker.unsubscribe({ props: id })
      }
    }
  }

  terminate(): void {
    this.worker.terminate()
    this.worker.removeAllListeners()
  }

  private setupCollision(props: Partial<BodyProps>, uuid: string) {
    this.events[uuid] = {
      collide: props?.onCollide,
      collideBegin: props?.onCollideBegin,
      collideEnd: props?.onCollideEnd,
    }
  }
}
