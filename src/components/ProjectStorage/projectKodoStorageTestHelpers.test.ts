import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export interface KodoPayload {
  accessKey: string
  secretKey: string
  bucket: string
  region: string
  domain: string
}

export interface KodoVerifyResult {
  ok: boolean
  message: string
  lastVerifiedAt: string | null
}

export interface KodoVerifyOptions {
  projectId?: string
  projectName?: string
  probeId?: string
  now?: () => string
  createClient?: (payload: KodoPayload) => Promise<{
    putObject: (objectKey: string, body: Buffer, mimeType: string) => Promise<void>
    statObject: (objectKey: string) => Promise<void>
    getObject: (objectKey: string) => Promise<Buffer>
    deleteObject: (objectKey: string) => Promise<void>
  }>
}

export interface KodoObjectOptions {
  createClient?: (payload: KodoPayload) => Promise<{
    statObject: (objectKey: string) => Promise<{ mimeType?: string }>
    getObject: (objectKey: string) => Promise<Buffer>
  }>
}

export const {
  downloadBuffer,
  getKodoObject,
  normalizeDownloadDomain,
  normalizeKodoPayload,
  verifyKodoProfile,
} = require('../../../electron/projectKodoStorage.cjs') as {
  downloadBuffer: (url: string) => Promise<Buffer>
  getKodoObject: (profile: unknown, objectKey: string, options: KodoObjectOptions) => Promise<{ data: Buffer; mimeType: string }>
  normalizeDownloadDomain: (domain: string) => string
  normalizeKodoPayload: (profile: unknown) => KodoPayload
  verifyKodoProfile: (profile: unknown, options: KodoVerifyOptions) => Promise<KodoVerifyResult>
}

export function kodoProfile(payload: Record<string, unknown>) {
  return {
    id: 'kodo1',
    type: 'qiniu_kodo',
    lastVerifiedAt: null,
    encryptedPayload: {
      payload: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
    },
  }
}

export const validPayload = {
  accessKey: 'ak',
  secretKey: 'sk',
  bucket: 'asset-bucket',
  region: 'z2',
  domain: 'https://cdn.example.com',
}
