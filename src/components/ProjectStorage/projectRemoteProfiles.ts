export interface DatabaseProfileInput {
  provider: 'postgresql' | 'mysql'
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
}

export interface KodoProfileInput {
  accessKey: string
  secretKey: string
  bucket: string
  region: string
  domain: string
}

export function validateDatabaseProfileInput(input: DatabaseProfileInput): string[] {
  const errors: string[] = []
  if (input.provider !== 'postgresql' && input.provider !== 'mysql') errors.push('数据库类型必须是 PostgreSQL 或 MySQL')
  if (!input.host.trim()) errors.push('缺少数据库主机')
  if (!Number.isInteger(input.port) || input.port <= 0) errors.push('数据库端口无效')
  if (!input.database.trim()) errors.push('缺少数据库名')
  if (!input.username.trim()) errors.push('缺少数据库用户名')
  if (!input.password) errors.push('缺少数据库密码')
  return errors
}

export function validateKodoProfileInput(input: KodoProfileInput): string[] {
  const errors: string[] = []
  if (!input.accessKey.trim()) errors.push('缺少 Access Key')
  if (!input.secretKey.trim()) errors.push('缺少 Secret Key')
  if (!input.bucket.trim()) errors.push('缺少 Bucket')
  if (!input.region.trim()) errors.push('缺少 Region')
  return errors
}

export function redactDatabaseProfile(input: DatabaseProfileInput) {
  return {
    provider: input.provider,
    redactedSummary: `${input.username}@${input.host}:${input.port}/${input.database}${input.ssl ? ' (SSL)' : ''}`,
  }
}

export function redactKodoProfile(input: KodoProfileInput) {
  return {
    provider: 'qiniu_kodo' as const,
    redactedSummary: `${input.bucket}@${input.region}${input.domain ? ` ${input.domain}` : ''}`,
  }
}
