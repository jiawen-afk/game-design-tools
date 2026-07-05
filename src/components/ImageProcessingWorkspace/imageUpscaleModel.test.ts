import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildUpscaylCliArgs,
  canUseUpscaleForExport,
  defaultUpscaleOptions,
  getUpscaleInstallPlan,
  normalizeUpscaleOptions,
  upscaylRuntimeVersion,
  upscaylModels,
  type UpscaleRuntimeStatus,
} from './imageUpscaleModel'

test('image upscale is optional and never blocks normal export when disabled or unavailable', () => {
  const missing: UpscaleRuntimeStatus = { installed: false, path: '', models: [], message: '未安装' }

  assert.equal(canUseUpscaleForExport(false, missing), false)
  assert.equal(canUseUpscaleForExport(true, missing), false)
  assert.equal(canUseUpscaleForExport(true, { installed: true, path: 'runtime', models: ['upscayl-standard-4x'] }), true)
})

test('image upscale options normalize model, scale, gpu, threads, and advanced defaults', () => {
  assert.deepEqual(normalizeUpscaleOptions({
    model: 'bad-model' as never,
    scale: 9,
    tileSize: -1,
    ttaMode: undefined,
    gpuId: '-1' as never,
    threadProfile: 'bad-profile' as never,
  }), {
    ...defaultUpscaleOptions,
  })
  const customOptions = {
    ...defaultUpscaleOptions,
    model: 'digital-art-4x' as const,
    scale: 2,
    tileSize: 128,
    ttaMode: true,
    gpuId: '1' as const,
    threadProfile: 'throughput' as const,
  }
  assert.deepEqual(normalizeUpscaleOptions(customOptions), customOptions)
})

test('image upscale builds upscayl-bin cli args with explicit gpu and thread profile', () => {
  assert.deepEqual(
    buildUpscaylCliArgs({
      inputPath: 'C:\\temp\\input.png',
      outputPath: 'C:\\temp\\output.webp',
      modelsPath: 'C:\\runtime\\models',
      format: 'webp',
      options: {
        model: 'digital-art-4x',
        scale: 2,
        tileSize: 128,
        ttaMode: true,
        gpuId: '1',
        threadProfile: 'throughput',
      },
    }),
    [
      '-i', 'C:\\temp\\input.png',
      '-o', 'C:\\temp\\output.webp',
      '-m', 'C:\\runtime\\models',
      '-n', 'digital-art-4x',
      '-f', 'webp',
      '-s', '2',
      '-c', '0',
      '-g', '1',
      '-j', '2:2:2',
      '-t', '128',
      '-x',
    ]
  )
})

test('image upscale can leave gpu selection automatic while keeping explicit threads', () => {
  const args = buildUpscaylCliArgs({
    inputPath: 'C:\\temp\\input.png',
    outputPath: 'C:\\temp\\output.png',
    modelsPath: 'C:\\runtime\\models',
    format: 'png',
    options: { ...defaultUpscaleOptions, gpuId: 'auto', threadProfile: 'low-memory' },
  })

  assert.equal(args.includes('-g'), false)
  assert.deepEqual(args.slice(args.indexOf('-j'), args.indexOf('-j') + 2), ['-j', '1:1:1'])
})

test('image upscale install plan uses mirrored raw files and required runtime assets', () => {
  const plan = getUpscaleInstallPlan('https://mirror.example.com/upscayl/main')

  assert.equal(plan.runtimeVersion, upscaylRuntimeVersion)
  assert.equal(plan.files.some((file) => file.targetPath === 'bin/upscayl-bin.exe'), true)
  assert.equal(plan.files.some((file) => file.targetPath === 'bin/vcomp140.dll'), true)
  assert.equal(plan.files.some((file) => file.targetPath === 'models/upscayl-standard-4x.param'), true)
  assert.equal(plan.files.some((file) => file.targetPath === 'models/upscayl-standard-4x.bin'), true)
  for (const model of upscaylModels) {
    assert.equal(plan.files.some((file) => file.targetPath === `models/${model}.param`), true)
    assert.equal(plan.files.some((file) => file.targetPath === `models/${model}.bin`), true)
  }
  assert.equal(plan.files[0]?.url.startsWith('https://mirror.example.com/upscayl/main/'), true)
})
