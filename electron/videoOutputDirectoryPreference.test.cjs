const test = require('node:test')
const assert = require('node:assert/strict')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const {
  createVideoOutputDirectorySession,
  loadVideoOutputDirectoryPreference,
  resolveVideoOutputDirectoryPreferencePath,
  saveVideoOutputDirectoryPreference,
} = require('./videoOutputDirectoryPreference.cjs')

async function createFixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'gdt-video-output-directory-'))
  const userData = path.join(root, 'user-data')
  const app = {
    getPath(name) {
      assert.equal(name, 'userData')
      return userData
    },
  }
  await fsp.mkdir(userData, { recursive: true })
  return {
    app,
    root,
    userData,
    async cleanup() {
      await fsp.rm(root, { recursive: true, force: true })
    },
  }
}

test('video output directory session starts one restoration when created', async (t) => {
  const fixture = await createFixture()
  t.after(fixture.cleanup)
  let getPathCalls = 0
  const app = {
    getPath(name) {
      getPathCalls += 1
      return fixture.app.getPath(name)
    },
  }

  const session = createVideoOutputDirectorySession(app)
  assert.equal(getPathCalls, 1)
  assert.equal(await session.restore(), null)
  assert.equal(await session.restore(), null)
  assert.equal(getPathCalls, 1)
})

test('video output directory session remembers and restores a selected directory', async (t) => {
  const fixture = await createFixture()
  t.after(fixture.cleanup)
  const outputDirectory = path.join(fixture.root, 'exports')
  await fsp.mkdir(outputDirectory)

  const session = createVideoOutputDirectorySession(fixture.app)
  assert.equal(await session.restore(), null)
  assert.equal(session.get(), null)

  const selected = await session.remember(path.join(outputDirectory, '.'))
  assert.deepEqual(selected, {
    name: path.basename(outputDirectory),
    path: path.resolve(outputDirectory),
  })
  assert.deepEqual(session.get(), selected)
  assert.equal(session.selectedOutputDirectories.has(path.resolve(outputDirectory)), true)

  const restoredSession = createVideoOutputDirectorySession(fixture.app)
  assert.deepEqual(await restoredSession.restore(), selected)
  assert.deepEqual(restoredSession.get(), selected)
  assert.equal(restoredSession.selectedOutputDirectories.has(selected.path), true)
})

test('saving a second video output directory atomically replaces the first preference', async (t) => {
  const fixture = await createFixture()
  t.after(fixture.cleanup)
  const firstDirectory = path.join(fixture.root, 'first')
  const secondDirectory = path.join(fixture.root, 'second')
  await Promise.all([
    fsp.mkdir(firstDirectory),
    fsp.mkdir(secondDirectory),
  ])

  const session = createVideoOutputDirectorySession(fixture.app)
  await session.remember(firstDirectory)
  const second = await session.remember(secondDirectory)
  const preferencePath = resolveVideoOutputDirectoryPreferencePath(fixture.app)
  const stored = JSON.parse(await fsp.readFile(preferencePath, 'utf8'))

  assert.deepEqual(stored, {
    version: 1,
    outputDirectory: path.resolve(secondDirectory),
  })
  assert.deepEqual(await loadVideoOutputDirectoryPreference(fixture.app), second)
  assert.deepEqual(await createVideoOutputDirectorySession(fixture.app).restore(), second)
  assert.deepEqual(await fsp.readdir(fixture.userData), [path.basename(preferencePath)])
})

test('reading or restoring without remembering preserves the saved directory', async (t) => {
  const fixture = await createFixture()
  t.after(fixture.cleanup)
  const outputDirectory = path.join(fixture.root, 'exports')
  await fsp.mkdir(outputDirectory)
  const selected = await saveVideoOutputDirectoryPreference(fixture.app, outputDirectory)

  const session = createVideoOutputDirectorySession(fixture.app)
  assert.deepEqual(session.get(), null)
  assert.deepEqual(await session.restore(), selected)
  assert.deepEqual(session.get(), selected)

  const restoredAgain = await loadVideoOutputDirectoryPreference(fixture.app)
  assert.deepEqual(restoredAgain, selected)
})

for (const invalidPreference of [
  { name: 'malformed JSON', contents: '{' },
  { name: 'blank path', contents: JSON.stringify({ version: 1, outputDirectory: '   ' }) },
  { name: 'unsupported version', contents: JSON.stringify({ version: 2, outputDirectory: 'C:\\exports' }) },
]) {
  test(`invalid video output preference clears ${invalidPreference.name}`, async (t) => {
    const fixture = await createFixture()
    t.after(fixture.cleanup)
    const preferencePath = resolveVideoOutputDirectoryPreferencePath(fixture.app)
    await fsp.writeFile(preferencePath, invalidPreference.contents, 'utf8')

    assert.equal(await loadVideoOutputDirectoryPreference(fixture.app), null)
    await assert.rejects(fsp.stat(preferencePath), { code: 'ENOENT' })
  })
}

test('missing and regular-file video output paths restore as null and are cleared', async (t) => {
  const fixture = await createFixture()
  t.after(fixture.cleanup)
  const preferencePath = resolveVideoOutputDirectoryPreferencePath(fixture.app)
  const missingDirectory = path.join(fixture.root, 'missing')
  await fsp.writeFile(preferencePath, JSON.stringify({
    version: 1,
    outputDirectory: missingDirectory,
  }), 'utf8')

  assert.equal(await loadVideoOutputDirectoryPreference(fixture.app), null)
  await assert.rejects(fsp.stat(preferencePath), { code: 'ENOENT' })

  const regularFile = path.join(fixture.root, 'not-a-directory.txt')
  await fsp.writeFile(regularFile, 'file', 'utf8')
  await fsp.writeFile(preferencePath, JSON.stringify({
    version: 1,
    outputDirectory: regularFile,
  }), 'utf8')

  assert.equal(await loadVideoOutputDirectoryPreference(fixture.app), null)
  await assert.rejects(fsp.stat(preferencePath), { code: 'ENOENT' })
})

test('failed remember leaves the current directory and authorization unchanged', async (t) => {
  const fixture = await createFixture()
  t.after(fixture.cleanup)
  const outputDirectory = path.join(fixture.root, 'exports')
  const missingDirectory = path.join(fixture.root, 'missing')
  await fsp.mkdir(outputDirectory)
  const session = createVideoOutputDirectorySession(fixture.app)
  const selected = await session.remember(outputDirectory)

  await assert.rejects(session.remember(missingDirectory))
  assert.deepEqual(session.get(), selected)
  assert.equal(session.selectedOutputDirectories.has(path.resolve(missingDirectory)), false)
  assert.deepEqual(await loadVideoOutputDirectoryPreference(fixture.app), selected)
})
