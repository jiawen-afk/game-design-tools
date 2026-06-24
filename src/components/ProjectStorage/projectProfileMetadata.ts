import type { DatabaseProfileInput } from './projectRemoteProfiles'

const DATABASE_CONNECTION_FIELDS: Array<keyof DatabaseProfileInput> = [
  'provider',
  'host',
  'port',
  'database',
  'username',
  'ssl',
]

export function shouldKeepDatabaseSchemaInitialization(
  previous: DatabaseProfileInput | null | undefined,
  next: DatabaseProfileInput,
) {
  if (!previous) return false
  return DATABASE_CONNECTION_FIELDS.every((field) => previous[field] === next[field])
}
