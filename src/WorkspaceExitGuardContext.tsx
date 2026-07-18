import { createContext, useContext, useEffect, type ReactNode } from 'react'

export type WorkspaceExitGuard = () => Promise<boolean>
export type WorkspaceExitGuardRegistrar = (guard: WorkspaceExitGuard | null) => void

export const WorkspaceExitGuardContext = createContext<WorkspaceExitGuardRegistrar | null>(null)

export function WorkspaceExitGuardProvider({
  children,
  register,
}: {
  children: ReactNode
  register: WorkspaceExitGuardRegistrar
}) {
  return (
    <WorkspaceExitGuardContext.Provider value={register}>
      {children}
    </WorkspaceExitGuardContext.Provider>
  )
}

export function useWorkspaceExitGuard(guard: WorkspaceExitGuard | null) {
  const register = useContext(WorkspaceExitGuardContext)

  useEffect(() => {
    register?.(guard)
    return () => register?.(null)
  }, [guard, register])
}
