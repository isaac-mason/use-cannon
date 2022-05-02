import type { World } from '@pmndrs/cannon-worker-api'
import { createContext, useContext } from 'react'

export type PhysicsContext = {
  world: World
}

export const physicsContext = createContext<PhysicsContext | null>(null)

export const usePhysicsContext = () => {
  const context = useContext(physicsContext)
  if (!context)
    throw new Error(
      'Physics context not found. @react-three/cannon & components can only be used within a Physics provider',
    )
  return context
}
