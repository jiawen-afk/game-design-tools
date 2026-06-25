export interface ProjectObjectDeleteResult {
  deletedKeys: string[]
  failed: Array<{ objectKey: string; errorMessage: string }>
}

export interface ProjectObjectStorage {
  putObject(objectKey: string, data: Blob): Promise<void>
  getObject(objectKey: string): Promise<Blob>
  deleteObject(objectKey: string): Promise<void>
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
