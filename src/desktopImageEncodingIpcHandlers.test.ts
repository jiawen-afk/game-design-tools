import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildEncoderCommand } = require('../electron/imageEncodingIpcHandlers.cjs')

test('desktop image encoding IPC builds cwebp lossless alpha preserving command', () => {
  const command = buildEncoderCommand({
    encoderPath: 'D:\\app\\scripts\\image-encoders\\win32-x64\\cwebp.exe',
    encoder: 'cwebp-lossless',
    inputPath: 'D:\\temp\\input.png',
    outputPath: 'D:\\temp\\output.webp',
  })

  assert.equal(command.command.endsWith('cwebp.exe'), true)
  assert.deepEqual(command.args, [
    'D:\\temp\\input.png',
    '-lossless',
    '-exact',
    '-alpha_q',
    '100',
    '-m',
    '6',
    '-o',
    'D:\\temp\\output.webp',
  ])
})

test('desktop image encoding IPC builds oxipng optimized output command', () => {
  const command = buildEncoderCommand({
    encoderPath: 'D:\\app\\scripts\\image-encoders\\win32-x64\\oxipng.exe',
    encoder: 'oxipng',
    inputPath: 'D:\\temp\\input.png',
    outputPath: 'D:\\temp\\output.png',
  })

  assert.equal(command.command.endsWith('oxipng.exe'), true)
  assert.deepEqual(command.args, [
    '-o',
    '4',
    '--strip',
    'safe',
    '--out',
    'D:\\temp\\output.png',
    'D:\\temp\\input.png',
  ])
})
