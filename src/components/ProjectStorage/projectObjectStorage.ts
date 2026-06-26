export interface ProjectObjectDeleteResult {
  deletedKeys: string[]
  failed: Array<{ objectKey: string; errorMessage: string }>
}

export interface ProjectObjectStorageContext {
  projectId?: string
}

export interface ProjectObjectStorage {
  putObject(objectKey: string, data: Blob, context?: ProjectObjectStorageContext): Promise<void>
  getObject(objectKey: string, context?: ProjectObjectStorageContext): Promise<Blob>
  deleteObject(objectKey: string, context?: ProjectObjectStorageContext): Promise<void>
  deleteObjects(objectKeys: string[]): Promise<ProjectObjectDeleteResult>
}

export async function deleteProjectObjectsIndividually(
  objectKeys: string[],
  deleteObject: (objectKey: string) => Promise<void>,
): Promise<ProjectObjectDeleteResult> {
  const deletedKeys: string[] = []
  const failed: ProjectObjectDeleteResult['failed'] = []
  for (const objectKey of objectKeys) {
    try {
      await deleteObject(objectKey)
      deletedKeys.push(objectKey)
    } catch (error) {
      failed.push({ objectKey, errorMessage: error instanceof Error ? error.message : String(error) })
    }
  }
  return { deletedKeys, failed }
}
