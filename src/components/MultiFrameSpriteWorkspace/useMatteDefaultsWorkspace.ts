import { useState } from 'react'
import { message } from 'antd'

import { coerceMatteDefaults, type MatteDefaults } from './matteModel'
import { readStoredMatteDefaults, writeStoredMatteDefaults } from './storage'

export function useMatteDefaultsWorkspace() {
  const [matteDefaults, setMatteDefaults] = useState<MatteDefaults>(() => readStoredMatteDefaults())
  const [matteDefaultsOpen, setMatteDefaultsOpen] = useState(false)
  const [matteDefaultsDraft, setMatteDefaultsDraft] = useState<MatteDefaults>(() => readStoredMatteDefaults())

  const openMatteDefaults = () => {
    setMatteDefaultsDraft(matteDefaults)
    setMatteDefaultsOpen(true)
  }

  const saveMatteDefaults = () => {
    const next = coerceMatteDefaults(matteDefaultsDraft)
    setMatteDefaults(next)
    try {
      writeStoredMatteDefaults(next)
    } catch {
      // 本地存储不可用时仍保留本次会话设置
    }
    setMatteDefaultsOpen(false)
    message.success('已保存抠图默认参数')
  }

  return {
    matteDefaults,
    matteDefaultsOpen,
    setMatteDefaultsOpen,
    matteDefaultsDraft,
    setMatteDefaultsDraft,
    openMatteDefaults,
    saveMatteDefaults,
  }
}
