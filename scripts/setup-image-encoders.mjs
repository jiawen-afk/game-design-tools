import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runtimeDir = path.join(repoRoot, 'scripts', 'image-encoders', 'win32-x64')
const files = [
  {
    name: 'cwebp.exe',
    url: 'https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-1.5.0-windows-x64.zip',
    archivePathHint: 'bin/cwebp.exe',
  },
  {
    name: 'oxipng.exe',
    url: 'https://github.com/shssoichiro/oxipng/releases/download/v9.1.5/oxipng-9.1.5-x86_64-pc-windows-msvc.zip',
    archivePathHint: 'oxipng.exe',
  },
]

function download(url, targetPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume()
        download(response.headers.location, targetPath).then(resolve, reject)
        return
      }
      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`Download failed ${response.statusCode}: ${url}`))
        return
      }
      const file = createWriteStream(targetPath)
      response.pipe(file)
      file.on('finish', () => file.close(resolve))
      file.on('error', reject)
    })
    request.on('error', reject)
    request.setTimeout(120000, () => request.destroy(new Error(`Download timed out: ${url}`)))
  })
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('Image encoder setup skipped: Windows x64 release assets are prepared on Windows runners.')
    return
  }
  await mkdir(runtimeDir, { recursive: true })
  const missing = files.filter((file) => !existsSync(path.join(runtimeDir, file.name)))
  if (missing.length === 0) {
    console.log(`Image encoders already present: ${runtimeDir}`)
    return
  }

  const yauzl = await import('yauzl')
  for (const file of missing) {
    const archivePath = path.join(runtimeDir, `${file.name}.zip`)
    await download(file.url, archivePath)
    await extractOne(yauzl, archivePath, file.archivePathHint, path.join(runtimeDir, file.name))
    await rm(archivePath, { force: true })
  }
}

function extractOne(yauzl, archivePath, entrySuffix, targetPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) {
        reject(openError || new Error(`Cannot open ${archivePath}`))
        return
      }
      zipFile.readEntry()
      zipFile.on('entry', (entry) => {
        if (!entry.fileName.replace(/\\/g, '/').endsWith(entrySuffix)) {
          zipFile.readEntry()
          return
        }
        zipFile.openReadStream(entry, (streamError, readStream) => {
          if (streamError || !readStream) {
            reject(streamError || new Error(`Cannot read ${entry.fileName}`))
            return
          }
          const output = createWriteStream(targetPath)
          readStream.pipe(output)
          output.on('finish', () => {
            zipFile.close()
            resolve()
          })
          output.on('error', reject)
        })
      })
      zipFile.on('end', () => reject(new Error(`Missing ${entrySuffix} in ${archivePath}`)))
      zipFile.on('error', reject)
    })
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
