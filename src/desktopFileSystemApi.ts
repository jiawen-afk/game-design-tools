export interface DesktopDirectoryInfo {
  name: string
  path: string
}

export interface DesktopFileInfo {
  name: string
  path: string
}

export interface DesktopFileReadResult extends DesktopFileInfo {
  data: ArrayBuffer | Uint8Array
}

export interface DesktopFileSystemApi {
  selectPersonalSpaceDirectory(): Promise<DesktopDirectoryInfo | null>
  registerPersonalSpaceDirectory(rootPath: string): Promise<DesktopDirectoryInfo>
  ensurePersonalSpaceDirectory(parentPath: string, name: string, options?: { create?: boolean }): Promise<DesktopDirectoryInfo>
  getPersonalSpaceFile(parentPath: string, name: string, options?: { create?: boolean }): Promise<DesktopFileInfo>
  readPersonalSpaceFile(filePath: string): Promise<DesktopFileReadResult>
  writePersonalSpaceFile(filePath: string, data: ArrayBuffer): Promise<boolean>
  removePersonalSpaceEntry(parentPath: string, name: string): Promise<boolean>
  saveFile(fileName: string, data: ArrayBuffer): Promise<DesktopFileInfo | null>
  openPath(targetPath: string): Promise<boolean>
}
