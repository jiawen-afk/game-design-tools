export interface PersonalSpaceAssetCover {
  name: string
  data: Blob
  resourcePath?: string
}

export interface PersonalSpaceAssetCoverOptions {
  createCover?: (file: File) => Promise<PersonalSpaceAssetCover | null>
}

function coverFileName(fileName: string) {
  const cleanName = fileName.trim() || 'cover.webp'
  const withoutExt = cleanName.replace(/\.[^.\\/]+$/, '') || 'cover'
  return `${withoutExt}-cover.webp`
}

function loadImageElement(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('封面图片加载失败。'))
    image.src = source
  })
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('封面图片生成失败。'))
    }, 'image/webp', 0.72)
  })
}

export async function createDefaultImageAssetCover(file: File): Promise<PersonalSpaceAssetCover | null> {
  if (!file.type.startsWith('image/')) return null
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null

  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await loadImageElement(sourceUrl)
    const maxSide = 160
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前环境不支持生成素材封面。')
    context.drawImage(image, 0, 0, width, height)
    const data = await canvasToBlob(canvas)
    return {
      name: coverFileName(file.name),
      data,
    }
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

export async function createAssetCover(
  file: File,
  options: PersonalSpaceAssetCoverOptions = {},
) {
  const createCover = options.createCover ?? createDefaultImageAssetCover
  return createCover(file)
}
