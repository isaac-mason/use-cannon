import { DynamicDrawUsage, Object3D } from 'three'
import { InstancedMesh } from 'three'
import { Matrix4, Quaternion, Vector3 } from 'three'

import type { BodyProps, BodyShapeType, Shape } from './body'
import type { CannonWorkerProps } from './cannon-worker-api'
import { CannonWorkerAPI } from './cannon-worker-api'
import type { ContactMaterial } from './contact-material'
import type {
  Broadphase,
  CannonEvents,
  Refs,
  ScaleOverrides,
  Subscriptions,
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

function apply(
  index: number,
  positions: Float32Array,
  quaternions: Float32Array,
  scale = s,
  object?: Object3D,
) {
  if (index !== undefined) {
    m.compose(v.fromArray(positions, index * 3), q.fromArray(quaternions, index * 4), scale)
    if (object) {
      object.matrixAutoUpdate = false
      object.matrix.copy(m)
    }
    return m
  }
  return m.identity()
}

const temp = new Object3D()

function prepare(object: Object3D, props: BodyProps) {
  object.userData = props.userData || {}
  object.position.set(...(props.position || [0, 0, 0]))
  object.rotation.set(...(props.rotation || [0, 0, 0]))
  object.updateMatrix()
}

export type WorldDebugApi = {
  add(id: string, props: BodyProps, type: BodyShapeType): void
  remove(id: string): void
}

export type WorldProps = CannonWorkerProps & {
  onInvalidate?: () => void
}

export class World {
  bodies: { [uuid: string]: number } = {}
  debugger?: WorldDebugApi
  events: CannonEvents = {}
  onInvalidate?: () => void
  refs: Refs = {}
  scaleOverrides: ScaleOverrides = {}
  subscriptions: Subscriptions = {}
  worker: CannonWorkerAPI

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
    onInvalidate,
  }: WorldProps = {}) {
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

    this.onInvalidate = onInvalidate
  }

  addBody(shape: Shape, object?: Object3D): void {
    const [uuid] = this.createBodies(shape.type, () => shape.props, object)
    shape.uuid = uuid
    shape.world = this
  }

  addContactMaterial(material: ContactMaterial): void {
    this.worker.addContactMaterial({
      props: [material.materialA, material.materialB, material.options],
      uuid: material.id,
    })
  }

  addInstancedBodies<T extends Shape>(shapes: T[], object: InstancedMesh): void {
    const uuids = this.createBodies(shapes[0].type, (idx) => shapes[idx as number].props, object)
    shapes.forEach((shape, idx) => {
      shape.uuid = uuids[idx]
      shape.world = this
    })
  }

  createBodies(
    type: BodyShapeType,
    fn: (idx?: number) => BodyProps<unknown[]>,
    object = new Object3D(),
    argsFn: (args?: unknown[]) => unknown[] | undefined = (args) => args,
  ): string[] {
    const objectCount =
      object instanceof InstancedMesh ? (object.instanceMatrix.setUsage(DynamicDrawUsage), object.count) : 1

    const uuid =
      object instanceof InstancedMesh
        ? new Array(objectCount).fill(0).map((_, i) => `${object.uuid}/${i}`)
        : [object.uuid]

    const props: BodyProps<unknown[]>[] =
      object instanceof InstancedMesh
        ? uuid.map((id, i) => {
            const props = fn(i)
            prepare(temp, props)
            object.setMatrixAt(i, temp.matrix)
            object.instanceMatrix.needsUpdate = true
            this.refs[id] = object
            this.debugger?.add(id, props, type)
            this.setupCollision(props, id)
            return { ...props, args: argsFn(props.args) }
          })
        : uuid.map((id, i) => {
            const props = fn(i)
            prepare(object, props)
            this.refs[id] = object
            this.debugger?.add(id, props, type)
            this.setupCollision(props, id)
            return { ...props, args: argsFn(props.args) }
          })

    this.worker.addBodies({
      props: props.map(({ onCollide, onCollideBegin, onCollideEnd, ...serializableProps }) => {
        return { onCollide: Boolean(onCollide), ...serializableProps }
      }),
      type,
      uuid,
    })

    return uuid
  }

  destroyBodies(uuid: string[]): void {
    for (const id of uuid) {
      delete this.refs[id]
      delete this.events[id]
      this.debugger?.remove(id)
    }
    this.worker.removeBodies({ uuid })
  }

  init(): void {
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
            const scale = this.scaleOverrides[ref.uuid] || ref.scale
            apply(this.bodies[ref.uuid], positions, quaternions, scale, ref)
          }
        }
        if (this.onInvalidate) {
          this.onInvalidate()
        }
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

    this.worker.connect()
    this.worker.init()
    this.worker.on('collide', collideHandler)
    this.worker.on('collideBegin', collideBeginHandler)
    this.worker.on('collideEnd', collideEndHandler)
    this.worker.on('frame', frameHandler)
    this.worker.on('rayhit', rayhitHandler)
  }

  removeBody(shape: Shape): void {
    this.destroyBodies([shape.getUUID()])
  }

  removeContactMaterial(material: ContactMaterial): void {
    this.worker.removeContactMaterial({ uuid: material.id })
  }

  step(stepSize: number, timeSinceLastCalled?: number, maxSubSteps = 10) {
    this.worker.step({ maxSubSteps, stepSize, timeSinceLastCalled })
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
