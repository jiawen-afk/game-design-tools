import { useEffect, useState } from 'react'

import {
  type VoiceGenerationRecord,
  clearVoiceRecords,
  deleteVoiceRecord,
  updateRecordName,
} from './voiceDeploymentModel'
import { readStoredRecords, writeStoredRecords } from './voiceRecordStorage'

export function useVoiceRecordLibrary() {
  const [records, setRecords] = useState<VoiceGenerationRecord[]>(readStoredRecords)
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null)

  useEffect(() => {
    writeStoredRecords(records)
  }, [records])

  const addRecord = (record: VoiceGenerationRecord) => {
    setRecords((current) => [record, ...current].slice(0, 80))
    setLastGeneratedId(record.id)
  }

  const renameRecord = (id: string, name: string) => {
    setRecords((current) => updateRecordName(current, id, name))
  }

  const deleteRecord = (id: string) => {
    setRecords((current) => deleteVoiceRecord(current, id))
  }

  const clearRecords = () => {
    setRecords((current) => clearVoiceRecords(current))
    setLastGeneratedId(null)
  }

  return {
    records,
    lastGeneratedId,
    addRecord,
    renameRecord,
    deleteRecord,
    clearRecords,
  }
}
