import type { WorldProps } from '@pmndrs/cannon-worker-api'
import { World } from '@pmndrs/cannon-worker-api'
import type { RenderCallback } from '@react-three/fiber'
import { useFrame, useThree } from '@react-three/fiber'
import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { PhysicsContext } from './physics-context'
import { physicsContext } from './physics-context'

export type PhysicsProviderProps = WorldProps & {
  isPaused?: boolean
  maxSubSteps?: number
  shouldInvalidate?: boolean
  stepSize?: number
}

export function PhysicsProvider({
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
  shouldInvalidate = true,
  size = 1000,
  solver = 'GS',
  stepSize = 1 / 60,
  tolerance = 0.001,
}: PropsWithChildren<PhysicsProviderProps>): JSX.Element {
  const { invalidate } = useThree()

  const [{ world }] = useState<PhysicsContext>(() => ({
    world: new World({
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
  }))

  useEffect(() => {
    if (shouldInvalidate) {
      world.onInvalidate = () => invalidate()
    }
  }, [shouldInvalidate])

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

  useEffect(() => {
    world.init()

    return () => {
      world.terminate()
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

  const value = useMemo<PhysicsContext>(() => ({ world }), [world])

  return <physicsContext.Provider value={value}>{children}</physicsContext.Provider>
}
