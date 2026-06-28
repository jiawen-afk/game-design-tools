const http = require('node:http')
const path = require('node:path')

const BIREFNET_MATTE_TIMEOUT_MS = 600000

function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function getJson(port, route, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path: route,
      method: 'GET',
      timeout: timeoutMs,
    }, (response) => {
      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { text += chunk })
      response.on('end', () => {
        let parsed = null
        try {
          parsed = text ? parseJsonText(text) : null
        } catch (error) {
          reject(new Error(`BiRefNet 服务返回无效 JSON：${error.message}`))
          return
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(parsed?.detail || parsed?.error || text || `BiRefNet 服务请求失败：${response.statusCode}`))
          return
        }
        resolve(parsed)
      })
    })
    request.on('error', reject)
    request.on('timeout', () => request.destroy(new Error('BiRefNet 服务连接超时。')))
    request.end()
  })
}

function postJson(port, route, payload, timeoutMs = 120000) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path: route,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
      },
      timeout: timeoutMs,
    }, (response) => {
      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { text += chunk })
      response.on('end', () => {
        let parsed = null
        try {
          parsed = text ? parseJsonText(text) : null
        } catch (error) {
          reject(new Error(`BiRefNet 服务返回无效 JSON：${error.message}`))
          return
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(parsed?.detail || parsed?.error || text || `BiRefNet 服务请求失败：${response.statusCode}`))
          return
        }
        resolve(parsed)
      })
    })
    request.on('error', reject)
    request.on('timeout', () => request.destroy(new Error('BiRefNet 服务处理超时。')))
    request.write(body)
    request.end()
  })
}

function checkBirefnetReady(port) {
  return getJson(port, '/ready', 15000)
}

async function removeBirefnetBackground(options = {}) {
  const port = Number(options.port || 17860)
  const inputName = path.basename(String(options.inputName || 'image.png'))
  const inputBuffer = Buffer.from(options.data)
  const result = await postJson(port, '/matte', {
    name: inputName,
    image_base64: inputBuffer.toString('base64'),
  }, BIREFNET_MATTE_TIMEOUT_MS)
  if (!result?.image_base64) throw new Error('BiRefNet 服务未返回图片数据。')
  return {
    name: `${path.basename(inputName, path.extname(inputName))}-birefnet.png`,
    data: Buffer.from(String(result.image_base64), 'base64'),
    width: Number(result.width || 0),
    height: Number(result.height || 0),
  }
}

module.exports = {
  checkBirefnetReady,
  getJson,
  postJson,
  removeBirefnetBackground,
}
