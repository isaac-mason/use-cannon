import type { CannonWorkerProps } from '@pmndrs/cannon-worker-api'
import { World } from '@pmndrs/cannon-worker-api'
import type { RenderCallback } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'

import type { ProviderContext } from './setup'
import { context } from './setup'

export type ProviderProps = PropsWithChildren<
  CannonWorkerProps & {
    isPaused?: boolean
    maxSubSteps?: number
    shouldInvalidate?: boolean
    stepSize?: number
  }
>

export const Provider: FC<ProviderProps> = ({
  allowSleep = false,
  axisIndex = 0,
  broadphase = 'Naive',
  children,
  defaultContactMaterial = { contactEquationStiffness: 1e6 },
  gravity = [0, -9.81, 0],
  isPaused = false,
  iterations = 5,
  maxSubSteps = 10,
  quatNormalizeFast = false,
  quatNormalizeSkip = 0,
  // shouldInvalidate = true,
  size = 1000,
  solver = 'GS',
  stepSize = 1 / 60,
  tolerance = 0.001,
}) => {
  // const { invalidate } = useThree()

  const [world] = useState<World>(
    () =>
      new World({
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
      }),
  )

  let timeSinceLastCalled = 0

  const loop = useCallback<RenderCallback>(
    (_, delta) => {
      if (isPaused) return
      timeSinceLastCalled += delta
      world.step(stepSize, timeSinceLastCalled, maxSubSteps)
      timeSinceLastCalled = 0
    },
    [isPaused, maxSubSteps, stepSize],
  )

  // Run loop *after* all the physics objects have ran theirs!
  // Otherwise the buffers will be invalidated by the browser
  useFrame(loop)

  useLayoutEffect(() => {
    return () => {
      world.worker.terminate()
      world.worker.removeAllListeners()
    }
  }, [])

  useEffect(() => {
    world.axisIndex = axisIndex
  }, [axisIndex])
  useEffect(() => {
    world.broadphase = broadphase
  }, [broadphase])
  useEffect(() => {
    world.gravity = gravity
  }, [gravity])
  useEffect(() => {
    world.iterations = iterations
  }, [iterations])
  useEffect(() => {
    world.tolerance = tolerance
  }, [tolerance])

  const value: ProviderContext = useMemo(() => ({ worker: world.worker, world }), [world])
  return <context.Provider value={value}>{children}</context.Provider>
}
