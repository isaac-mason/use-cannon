import EventEmitter from 'events'

// @ts-expect-error Types are not setup for this yet
import Worker from '../src/worker'
import type {
  AddBodiesMessage,
  AddConstraintMessage,
  AddContactMaterialMessage,
  AddRaycastVehicleMessage,
  AddRayMessage,
  AddSpringMessage,
  ApplyForceMessage,
  ApplyImpulseMessage,
  ApplyLocalForceMessage,
  ApplyLocalImpulseMessage,
  ApplyRaycastVehicleEngineForceMessage,
  ApplyTorque,
  AtomicMessage,
  Broadphase,
  CannonMessage,
  CannonWorker,
  CannonWorkerApiProps,
  DisableConstraintMessage,
  DisableConstraintMotorMessage,
  EnableConstraintMessage,
  EnableConstraintMotorMessage,
  IncomingWorkerMessage,
  QuaternionMessage,
  RemoveBodiesMessage,
  RemoveConstraintMessage,
  RemoveContactMaterialMessage,
  RemoveRaycastVehicleMessage,
  RemoveRayMessage,
  RemoveSpringMessage,
  RotationMessage,
  SetConstraintMotorMaxForce,
  SetConstraintMotorSpeed,
  SetRaycastVehicleBrakeMessage,
  SetRaycastVehicleSteeringValueMessage,
  SetSpringDampingMessage,
  SetSpringRestLengthMessage,
  SetSpringStiffnessMessage,
  SleepMessage,
  SubscribeMessage,
  Triplet,
  VectorMessage,
  WakeUpMessage,
} from './types'

type WithoutOp<T extends CannonMessage> = Omit<T, 'op'>

export class CannonWorkerApi extends EventEmitter {
  get axisIndex(): number {
    return this.config.axisIndex
  }
  set axisIndex(value: number) {
    this.config.axisIndex = value
    this.worker.postMessage({ op: 'setAxisIndex', props: value })
  }

  get broadphase(): Broadphase {
    return this.config.broadphase
  }
  set broadphase(value: Broadphase) {
    this.config.broadphase = value
    this.worker.postMessage({ op: 'setBroadphase', props: value })
  }

  get gravity(): Triplet {
    return this.config.gravity
  }
  set gravity(value: Triplet) {
    this.config.gravity = value
    this.worker.postMessage({ op: 'setGravity', props: value })
  }

  get iterations(): number {
    return this.config.iterations
  }
  set iterations(value: number) {
    this.config.iterations = value
    this.worker.postMessage({ op: 'setIterations', props: value })
  }

  get tolerance(): number {
    return this.config.tolerance
  }
  set tolerance(value: number) {
    this.config.tolerance = value
    this.worker.postMessage({ op: 'setTolerance', props: value })
  }

  private buffers: {
    positions: Float32Array
    quaternions: Float32Array
  }

  private config: Required<CannonWorkerApiProps>

  private worker = new Worker() as CannonWorker

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
  }: CannonWorkerApiProps) {
    super()

    this.config = {
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
    }

    this.buffers = {
      positions: new Float32Array(size * 3),
      quaternions: new Float32Array(size * 4),
    }

    this.worker.onmessage = (message: IncomingWorkerMessage) => {
      if (message.data.op === 'frame') {
        this.buffers.positions = message.data.positions
        this.buffers.quaternions = message.data.quaternions
        this.emit(message.data.op, message.data)
        return
      }

      this.emit(message.data.type, message.data)
    }
  }

  addBodies({ props, type, uuid }: WithoutOp<AddBodiesMessage>) {
    this.worker.postMessage({
      op: 'addBodies',
      props,
      type,
      uuid,
    })
  }

  addConstraint({ props: [refA, refB, optns], type, uuid }: WithoutOp<AddConstraintMessage>) {
    this.worker.postMessage({
      op: 'addConstraint',
      props: [refA, refB, optns],
      type,
      uuid,
    })
  }

  addContactMaterial({ props, uuid }: WithoutOp<AddContactMaterialMessage>) {
    this.worker.postMessage({
      op: 'addContactMaterial',
      props,
      uuid,
    })
  }

  addRay({ props, uuid }: WithoutOp<AddRayMessage>) {
    this.worker.postMessage({ op: 'addRay', props, uuid })
  }

  addRaycastVehicle({
    props: [chassisBodyUUID, wheelUUIDs, wheelInfos, indexForwardAxis, indexRightAxis, indexUpAxis],
    uuid,
  }: WithoutOp<AddRaycastVehicleMessage>) {
    this.worker.postMessage({
      op: 'addRaycastVehicle',
      props: [chassisBodyUUID, wheelUUIDs, wheelInfos, indexForwardAxis, indexRightAxis, indexUpAxis],
      uuid,
    })
  }

  addSpring({ props: [refA, refB, optns], uuid }: WithoutOp<AddSpringMessage>) {
    this.worker.postMessage({
      op: 'addSpring',
      props: [refA, refB, optns],
      uuid,
    })
  }

  applyForce({ props, uuid }: WithoutOp<ApplyForceMessage>) {
    this.worker.postMessage({ op: 'applyForce', props, uuid })
  }

  applyImpulse({ props, uuid }: WithoutOp<ApplyImpulseMessage>) {
    this.worker.postMessage({ op: 'applyImpulse', props, uuid })
  }

  applyLocalForce({ props, uuid }: WithoutOp<ApplyLocalForceMessage>) {
    this.worker.postMessage({ op: 'applyLocalForce', props, uuid })
  }

  applyLocalImpulse({ props, uuid }: WithoutOp<ApplyLocalImpulseMessage>) {
    this.worker.postMessage({ op: 'applyLocalImpulse', props, uuid })
  }

  applyRaycastVehicleEngineForce({ props, uuid }: WithoutOp<ApplyRaycastVehicleEngineForceMessage>) {
    this.worker.postMessage({
      op: 'applyRaycastVehicleEngineForce',
      props,
      uuid,
    })
  }

  applyTorque({ props, uuid }: WithoutOp<ApplyTorque>) {
    this.worker.postMessage({ op: 'applyTorque', props, uuid })
  }

  disableConstraint({ uuid }: WithoutOp<DisableConstraintMessage>) {
    this.worker.postMessage({ op: 'disableConstraint', uuid })
  }

  disableConstraintMotor({ uuid }: WithoutOp<DisableConstraintMotorMessage>) {
    this.worker.postMessage({ op: 'disableConstraintMotor', uuid })
  }

  enableConstraint({ uuid }: WithoutOp<EnableConstraintMessage>) {
    this.worker.postMessage({ op: 'enableConstraint', uuid })
  }

  enableConstraintMotor({ uuid }: WithoutOp<EnableConstraintMotorMessage>) {
    this.worker.postMessage({ op: 'enableConstraintMotor', uuid })
  }

  init(): void {
    const {
      allowSleep,
      axisIndex,
      broadphase,
      defaultContactMaterial,
      gravity,
      iterations,
      quatNormalizeFast,
      quatNormalizeSkip,
      solver,
      tolerance,
    } = this.config

    this.worker.postMessage({
      op: 'init',
      props: {
        allowSleep,
        axisIndex,
        broadphase,
        defaultContactMaterial,
        gravity,
        iterations,
        quatNormalizeFast,
        quatNormalizeSkip,
        solver,
        tolerance,
      },
    })
  }

  removeBodies({ uuid }: WithoutOp<RemoveBodiesMessage>) {
    this.worker.postMessage({ op: 'removeBodies', uuid })
  }

  removeConstraint({ uuid }: WithoutOp<RemoveConstraintMessage>) {
    this.worker.postMessage({ op: 'removeConstraint', uuid })
  }

  removeContactMaterial({ uuid }: WithoutOp<RemoveContactMaterialMessage>) {
    this.worker.postMessage({
      op: 'removeContactMaterial',
      uuid,
    })
  }

  removeRay({ uuid }: WithoutOp<RemoveRayMessage>) {
    this.worker.postMessage({ op: 'removeRay', uuid })
  }

  removeRaycastVehicle({ uuid }: WithoutOp<RemoveRaycastVehicleMessage>) {
    this.worker.postMessage({ op: 'removeRaycastVehicle', uuid })
  }

  removeSpring({ uuid }: WithoutOp<RemoveSpringMessage>) {
    this.worker.postMessage({ op: 'removeSpring', uuid })
  }

  setAllowSleep({ props, uuid }: WithoutOp<AtomicMessage<'allowSleep'>>) {
    this.worker.postMessage({ op: 'setAllowSleep', props, uuid })
  }

  setAngularDamping({ props, uuid }: WithoutOp<AtomicMessage<'angularDamping'>>) {
    this.worker.postMessage({ op: 'setAngularDamping', props, uuid })
  }

  setAngularFactor({ props, uuid }: WithoutOp<VectorMessage>) {
    this.worker.postMessage({ op: 'setAngularFactor', props, uuid })
  }

  setAngularVelocity({ props, uuid }: WithoutOp<VectorMessage>) {
    this.worker.postMessage({ op: 'setAngularVelocity', props, uuid })
  }

  setCollisionFilterGroup({ props, uuid }: WithoutOp<AtomicMessage<'collisionFilterGroup'>>) {
    this.worker.postMessage({ op: 'setCollisionFilterGroup', props, uuid })
  }

  setCollisionFilterMask({ props, uuid }: WithoutOp<AtomicMessage<'collisionFilterMask'>>) {
    this.worker.postMessage({ op: 'setCollisionFilterMask', props, uuid })
  }

  setCollisionResponse({ props, uuid }: WithoutOp<AtomicMessage<'collisionResponse'>>) {
    this.worker.postMessage({ op: 'setCollisionResponse', props, uuid })
  }

  setConstraintMotorMaxForce({ props, uuid }: WithoutOp<SetConstraintMotorMaxForce>) {
    this.worker.postMessage({ op: 'setConstraintMotorMaxForce', props, uuid })
  }

  setConstraintMotorSpeed({ props, uuid }: WithoutOp<SetConstraintMotorSpeed>) {
    this.worker.postMessage({ op: 'setConstraintMotorSpeed', props, uuid })
  }

  setFixedRotation({ props, uuid }: WithoutOp<AtomicMessage<'fixedRotation'>>) {
    this.worker.postMessage({ op: 'setFixedRotation', props, uuid })
  }

  setIsTrigger({ props, uuid }: WithoutOp<AtomicMessage<'isTrigger'>>) {
    this.worker.postMessage({ op: 'setIsTrigger', props, uuid })
  }

  setLinearDamping({ props, uuid }: WithoutOp<AtomicMessage<'linearDamping'>>) {
    this.worker.postMessage({ op: 'setLinearDamping', props, uuid })
  }

  setLinearFactor({ props, uuid }: WithoutOp<VectorMessage>) {
    this.worker.postMessage({ op: 'setLinearFactor', props, uuid })
  }

  setMass({ props, uuid }: WithoutOp<AtomicMessage<'mass'>>) {
    this.worker.postMessage({ op: 'setMass', props, uuid })
  }

  setMaterial({ props, uuid }: WithoutOp<AtomicMessage<'material'>>) {
    this.worker.postMessage({ op: 'setMaterial', props, uuid })
  }

  setPosition({ props, uuid }: WithoutOp<VectorMessage>) {
    this.worker.postMessage({ op: 'setPosition', props, uuid })
  }

  setQuaternion({ props: [x, y, z, w], uuid }: WithoutOp<QuaternionMessage>) {
    this.worker.postMessage({ op: 'setQuaternion', props: [x, y, z, w], uuid })
  }

  setRaycastVehicleBrake({ props, uuid }: WithoutOp<SetRaycastVehicleBrakeMessage>) {
    this.worker.postMessage({ op: 'setRaycastVehicleBrake', props, uuid })
  }

  setRaycastVehicleSteeringValue({ props, uuid }: WithoutOp<SetRaycastVehicleSteeringValueMessage>) {
    this.worker.postMessage({
      op: 'setRaycastVehicleSteeringValue',
      props,
      uuid,
    })
  }

  setRotation({ props, uuid }: WithoutOp<RotationMessage>) {
    this.worker.postMessage({ op: 'setRotation', props, uuid })
  }

  setSleepSpeedLimit({ props, uuid }: WithoutOp<AtomicMessage<'sleepSpeedLimit'>>) {
    this.worker.postMessage({ op: 'setSleepSpeedLimit', props, uuid })
  }

  setSleepTimeLimit({ props, uuid }: WithoutOp<AtomicMessage<'sleepTimeLimit'>>) {
    this.worker.postMessage({ op: 'setSleepTimeLimit', props, uuid })
  }

  setSpringDamping({ props, uuid }: WithoutOp<SetSpringDampingMessage>) {
    this.worker.postMessage({ op: 'setSpringDamping', props, uuid })
  }

  setSpringRestLength({ props, uuid }: WithoutOp<SetSpringRestLengthMessage>) {
    this.worker.postMessage({ op: 'setSpringRestLength', props, uuid })
  }

  setSpringStiffness({ props, uuid }: WithoutOp<SetSpringStiffnessMessage>) {
    this.worker.postMessage({ op: 'setSpringStiffness', props, uuid })
  }

  setUserData({ props, uuid }: WithoutOp<AtomicMessage<'userData'>>) {
    this.worker.postMessage({ op: 'setUserData', props, uuid })
  }

  setVelocity({ props, uuid }: WithoutOp<VectorMessage>) {
    this.worker.postMessage({ op: 'setVelocity', props, uuid })
  }

  sleep({ uuid }: WithoutOp<SleepMessage>) {
    this.worker.postMessage({ op: 'sleep', uuid })
  }

  step(stepSize: number, dt?: number, maxSubSteps?: number) {
    const {
      buffers: { positions, quaternions },
    } = this

    if (positions.byteLength === 0 || quaternions.byteLength === 0) {
      return
    }

    this.worker.postMessage({ op: 'step', positions, props: { dt, maxSubSteps, stepSize }, quaternions }, [
      positions.buffer,
      quaternions.buffer,
    ])
  }

  subscribe({ props: { id, target, type }, uuid }: WithoutOp<SubscribeMessage>) {
    this.worker.postMessage({ op: 'subscribe', props: { id, target, type }, uuid })
  }

  terminate(): void {
    this.worker.terminate()
  }

  unsubscribe({ props }: { props: number }) {
    this.worker.postMessage({ op: 'unsubscribe', props })
  }

  wakeUp({ uuid }: WithoutOp<WakeUpMessage>) {
    this.worker.postMessage({ op: 'wakeUp', uuid })
  }
}
