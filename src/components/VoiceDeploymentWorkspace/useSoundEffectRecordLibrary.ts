import { useEffect, useState } from 'react'

import {
  clearSoundEffectRecords,
  deleteSoundEffectRecord,
  updateSoundEffectRecordName,
  type SoundEffectRecord,
} from './soundEffectModel'
import { readStoredSoundEffectRecords, writeStoredSoundEffectRecords } from './soundEffectRecordStorage'

export function useSoundEffectRecordLibrary() {
  const [records, setRecords] = useState<SoundEffectRecord[]>(readStoredSoundEffectRecords)
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null)

  useEffect(() => {
    writeStoredSoundEffectRecords(records)
  }, [records])

  const addRecord = (record: SoundEffectRecord) => {
    setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)].slice(0, 80))
    setLastGeneratedId(record.id)
  }

  const renameRecord = (recordId: string, name: string) => {
    setRecords((current) => updateSoundEffectRecordName(current, recordId, name))
  }

  const deleteRecord = (recordId: string) => {
    setRecords((current) => deleteSoundEffectRecord(current, recordId))
  }

  const clearRecords = () => {
    setRecords((current) => clearSoundEffectRecords(current))
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
