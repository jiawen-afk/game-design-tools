const test = require('node:test')
const assert = require('node:assert/strict')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const {
  buildUpscaylArgs,
  executeUpscaylBatch,
} = require('../../../electron/upscaylIpcHandlers.cjs')

function binary(...bytes) {
  return Uint8Array.from(bytes).buffer
}

async function withTempRoot(run) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'gdt-upscayl-test-'))
  try {
    return await run(root)
  } finally {
    await fsp.rm(root, { recursive: true, force: true })
  }
}

function runtimePaths(root) {
  return {
    execPath: path.join(root, 'bin', 'upscayl-bin.exe'),
    binDir: path.join(root, 'bin'),
    modelsDir: path.join(root, 'models'),
  }
}

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

test('desktop upscayl batch launches once and maps ordered outputs by request id', async () => {
  await withTempRoot(async (root) => {
    const tempRoot = path.join(root, 'temp')
    await fsp.mkdir(tempRoot, { recursive: true })
    let launches = 0
    const runCommandOutput = async (_command, args) => {
      launches += 1
      const inputDir = args[args.indexOf('-i') + 1]
      const outputDir = args[args.indexOf('-o') + 1]
      const inputNames = (await fsp.readdir(inputDir)).sort()
      assert.deepEqual(inputNames, ['item-000000.png', 'item-000001.png'])
      await fsp.writeFile(path.join(outputDir, 'item-000001.webp'), Buffer.from('second-output'))
      await fsp.writeFile(path.join(outputDir, 'item-000000.webp'), Buffer.from('first-output'))
      return { ok: true, output: '2/2' }
    }

    const results = await executeUpscaylBatch({
      items: [
        { id: 'first', inputName: 'same.png', data: binary(1) },
        { id: 'second', inputName: 'same.png', data: binary(2) },
      ],
      outputFormat: 'webp',
      options: { threadProfile: 'throughput' },
      paths: runtimePaths(root),
      tempRoot,
      runCommandOutput,
    })

    assert.equal(launches, 1)
    assert.deepEqual(results.map((result) => result.id), ['first', 'second'])
    assert.deepEqual(results.map((result) => result.name), ['same-upscaled.webp', 'same-upscaled.webp'])
    assert.equal(Buffer.from(results[0].data).toString('utf8'), 'first-output')
    assert.equal(Buffer.from(results[1].data).toString('utf8'), 'second-output')
    assert.deepEqual(await fsp.readdir(tempRoot), [])
  })
})

test('desktop upscayl batch rejects duplicate request ids before launch', async () => {
  await withTempRoot(async (root) => {
    let launches = 0
    await assert.rejects(() => executeUpscaylBatch({
      items: [
        { id: 'duplicate', inputName: 'a.png', data: binary(1) },
        { id: 'duplicate', inputName: 'b.png', data: binary(2) },
      ],
      outputFormat: 'png',
      options: {},
      paths: runtimePaths(root),
      tempRoot: path.join(root, 'temp'),
      runCommandOutput: async () => {
        launches += 1
        return { ok: true, output: '' }
      },
    }), /重复的批量图片 ID/)
    assert.equal(launches, 0)
  })
})

test('desktop upscayl batch rejects missing outputs and cleans temporary files', async () => {
  await withTempRoot(async (root) => {
    const tempRoot = path.join(root, 'temp')
    await fsp.mkdir(tempRoot, { recursive: true })
    await assert.rejects(() => executeUpscaylBatch({
      items: [
        { id: 'first', inputName: 'a.png', data: binary(1) },
        { id: 'missing', inputName: 'b.png', data: binary(2) },
      ],
      outputFormat: 'png',
      options: {},
      paths: runtimePaths(root),
      tempRoot,
      runCommandOutput: async (_command, args) => {
        const outputDir = args[args.indexOf('-o') + 1]
        await fsp.writeFile(path.join(outputDir, 'item-000000.png'), Buffer.from('first-output'))
        return { ok: true, output: '1/2' }
      },
    }), /missing/)
    assert.deepEqual(await fsp.readdir(tempRoot), [])
  })
})

test('desktop upscayl batch cleans temporary files when command fails', async () => {
  await withTempRoot(async (root) => {
    const tempRoot = path.join(root, 'temp')
    await fsp.mkdir(tempRoot, { recursive: true })
    await assert.rejects(() => executeUpscaylBatch({
      items: [{ id: 'first', inputName: 'a.png', data: binary(1) }],
      outputFormat: 'png',
      options: {},
      paths: runtimePaths(root),
      tempRoot,
      runCommandOutput: async () => ({ ok: false, output: 'simulated failure' }),
    }), /simulated failure/)
    assert.deepEqual(await fsp.readdir(tempRoot), [])
  })
})
