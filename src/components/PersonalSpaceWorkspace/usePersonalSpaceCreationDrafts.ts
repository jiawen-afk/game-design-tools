import { useState } from 'react'

export interface UsePersonalSpaceCreationDraftsOptions {
  createCharacterInSpace: (name: string) => void
  createStoryboardInSpace: (name: string) => void
}

export function usePersonalSpaceCreationDrafts({
  createCharacterInSpace,
  createStoryboardInSpace,
}: UsePersonalSpaceCreationDraftsOptions) {
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newStoryboardName, setNewStoryboardName] = useState('')

  const createCharacter = () => {
    createCharacterInSpace(newCharacterName)
    setNewCharacterName('')
  }

  const createStoryboard = () => {
    createStoryboardInSpace(newStoryboardName)
    setNewStoryboardName('')
  }

  return {
    newCharacterName,
    newStoryboardName,
    setNewCharacterName,
    setNewStoryboardName,
    createCharacter,
    createStoryboard,
  }
}
