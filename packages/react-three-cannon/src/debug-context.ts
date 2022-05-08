import type { WorldDebugApi } from '@pmndrs/cannon-worker-api'
import { createContext, useContext } from 'react'

export const debugContext = createContext<WorldDebugApi | null>(null)

export const useDebugContext = () => useContext(debugContext)
