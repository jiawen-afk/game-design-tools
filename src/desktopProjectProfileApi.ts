export interface ProjectConnectionProfileSummary {
  id: string
  type: 'database' | 'qiniu_kodo'
  displayName: string
  redactedSummary: string
  lastVerifiedAt: string | null
  schemaInitializedAt: string | null
}

export interface ProjectConnectionProfileDetail extends ProjectConnectionProfileSummary {
  payload: unknown
}

export interface ProjectConnectionVerificationResult {
  ok: boolean
  message: string
  lastVerifiedAt: string | null
}

export interface DesktopProjectProfileApi {
  listProjectConnectionProfiles(type?: 'database' | 'qiniu_kodo'): Promise<ProjectConnectionProfileSummary[]>
  getProjectConnectionProfile(profileId: string): Promise<ProjectConnectionProfileDetail | null>
  saveProjectConnectionProfile(input: unknown): Promise<ProjectConnectionProfileSummary>
  deleteProjectConnectionProfile(profileId: string): Promise<boolean>
  verifyProjectDatabaseProfile(profileId: string): Promise<ProjectConnectionVerificationResult>
  verifyProjectDatabaseProfileDraft(input: unknown, profileId?: string): Promise<ProjectConnectionVerificationResult>
  initializeProjectDatabaseSchema(profileId: string, dialect: 'postgresql' | 'mysql'): Promise<ProjectConnectionVerificationResult>
  verifyProjectKodoProfile(profileId: string, projectId: string): Promise<ProjectConnectionVerificationResult>
  verifyProjectKodoProfileDraft(input: unknown, projectId: string, profileId?: string): Promise<ProjectConnectionVerificationResult>
}
