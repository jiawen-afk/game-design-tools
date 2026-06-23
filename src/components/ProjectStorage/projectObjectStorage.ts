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
