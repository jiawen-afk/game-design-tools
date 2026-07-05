const test = require('node:test')
const assert = require('node:assert/strict')

const { buildUpscaylArgs } = require('../../../electron/upscaylIpcHandlers.cjs')

test('desktop upscayl args pass gpu device and thread profile to upscayl-bin', () => {
  const args = buildUpscaylArgs({
    inputPath: 'C:\\temp\\input.png',
    outputPath: 'C:\\temp\\output.png',
    modelsPath: 'C:\\runtime\\models',
    format: 'png',
    options: {
      model: 'digital-art-4x',
      scale: 4,
      tileSize: 128,
      ttaMode: true,
      gpuId: '0',
      threadProfile: 'balanced',
    },
  })

  assert.deepEqual(args.slice(args.indexOf('-g'), args.indexOf('-g') + 2), ['-g', '0'])
  assert.deepEqual(args.slice(args.indexOf('-j'), args.indexOf('-j') + 2), ['-j', '1:2:2'])
  assert.notEqual(args.indexOf('-c'), -1, 'compression flag should remain separate from gpu selection')
  assert.notEqual(args.indexOf('-t'), -1, 'tile flag should remain available')
  assert.notEqual(args.indexOf('-x'), -1, 'tta flag should remain available')
})

test('desktop upscayl args reject cpu-style negative gpu ids', () => {
  const args = buildUpscaylArgs({
    inputPath: 'C:\\temp\\input.png',
    outputPath: 'C:\\temp\\output.png',
    modelsPath: 'C:\\runtime\\models',
    format: 'png',
    options: {
      gpuId: '-1',
      threadProfile: 'bad-profile',
    },
  })

  assert.deepEqual(args.slice(args.indexOf('-g'), args.indexOf('-g') + 2), ['-g', '0'])
  assert.deepEqual(args.slice(args.indexOf('-j'), args.indexOf('-j') + 2), ['-j', '1:2:2'])
})
