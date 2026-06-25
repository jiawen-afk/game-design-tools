export type DesktopBinaryData = ArrayBuffer | ArrayBufferView

export function copyDesktopBinaryData(data: DesktopBinaryData) {
  if (data instanceof ArrayBuffer) return new Uint8Array(data.slice(0))
  const source = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  const copy = new Uint8Array(source.byteLength)
  copy.set(source)
  return copy
}

export function blobFromDesktopBinaryData(data: DesktopBinaryData, mimeType = 'application/octet-stream') {
  const copy = copyDesktopBinaryData(data)
  return new Blob([copy.buffer], { type: mimeType })
}
