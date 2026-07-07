# Voice Audio Clip Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a waveform-based audio clip editor in the voice workbench so generated voice and generated sound effect records can be trimmed into new persisted history records.

**Architecture:** `wavesurfer.js` owns waveform and draggable region interaction. Pure model and encoding modules own clip range normalization, metadata shaping, PCM slicing, and WAV encoding. Electron owns durable edited-audio file persistence, while the existing voice and sound effect record libraries continue to own history state.

**Tech Stack:** React 19, Ant Design 6, wavesurfer.js, Web Audio API, Electron IPC, TypeScript, Node `node:test`.

## Global Constraints

- Use `wavesurfer.js` for waveform and region interaction.
- Do not use `ffmpeg.wasm` in the first version.
- Clip results from `生成配音` return to voice history.
- Clip results from `生成音效` return to sound effect history.
- Edited audio must be persisted under `%LOCALAPPDATA%/GameDesignTools/AudioEdits`.
- Electron returns `audioUrl` as a `file://` URL and `audioPath` as an absolute filesystem path.
- The minimum valid selected clip duration is `0.05s`.
- Keep UI controls compact, familiar, and consistent with the existing voice workbench.
- Keep `index.tsx` thin; put model logic in `*Model.ts`, browser audio work in `*Encoding.ts` or `*Service.ts`, and Electron persistence in focused IPC modules.

---

## File Structure

- Create `electron/audioEditIpcHandlers.cjs`: focused IPC handler for writing edited WAV files into the app-local audio-edit directory.
- Create `src/desktopAudioEditApi.ts`: typed renderer contract for `saveEditedAudio`.
- Modify `src/desktopApi.ts`: include `DesktopAudioEditApi` in the desktop facade.
- Modify `electron/preload.cjs`: expose `saveEditedAudio`.
- Modify `electron/main.cjs`: register `audioEditIpcHandlers`.
- Modify `src/appDesktopIpcStructure.test.ts`: assert the focused audio edit IPC boundary.
- Create `src/components/VoiceDeploymentWorkspace/audioClipModel.ts`: pure clip ranges, display formatting, source conversion, and child record creation.
- Create `src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts`: model coverage.
- Create `src/components/VoiceDeploymentWorkspace/audioClipEncoding.ts`: PCM slicing and WAV encoding.
- Create `src/components/VoiceDeploymentWorkspace/audioClipEncoding.test.ts`: WAV header and duration coverage.
- Create `src/components/VoiceDeploymentWorkspace/audioClipService.ts`: renderer workflow for fetch, decode, clip, encode, and persist.
- Create `src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts`: editor state and save orchestration.
- Create `src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx`: panel UI.
- Create `src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css`: compact editor styling.
- Modify `src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css`: import the editor CSS.
- Modify `src/components/VoiceDeploymentWorkspace/VoiceRecordLists.tsx`: add `剪辑片段` action for voice history.
- Modify `src/components/VoiceDeploymentWorkspace/VoiceLibraryPanel.tsx`: accept and forward the voice clip action.
- Modify `src/components/VoiceDeploymentWorkspace/SoundEffectLibraryPanel.tsx`: add `剪辑片段` action for sound effect history.
- Modify `src/components/VoiceDeploymentWorkspace/useVoiceDeploymentWorkspace.ts`: expose voice clip result insertion.
- Modify `src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts`: expose sound effect clip result insertion.
- Modify `src/components/VoiceDeploymentWorkspace/VoiceWorkspaceTabs.tsx`: add controlled `音频编辑` tab.
- Modify `src/components/VoiceDeploymentWorkspace/index.tsx`: own active tab state and connect both histories to the audio editor.
- Modify `src/voiceDeploymentSoundStructure.test.ts`: assert audio editor tab and sound clip action.
- Create or modify `src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`: assert focused editor modules and voice clip action.
- Modify `package.json` and `package-lock.json`: add `wavesurfer.js`.

---

### Task 1: Desktop Edited Audio Persistence

**Files:**
- Create: `electron/audioEditIpcHandlers.cjs`
- Create: `src/desktopAudioEditApi.ts`
- Modify: `src/desktopApi.ts`
- Modify: `electron/preload.cjs`
- Modify: `electron/main.cjs`
- Modify: `src/appDesktopIpcStructure.test.ts`
- Test: `src/appDesktopIpcStructure.test.ts`

**Interfaces:**
- Produces:
  - `DesktopAudioEditSaveOptions { fileName: string; data: ArrayBuffer }`
  - `DesktopAudioEditSaveResult { fileName: string; audioUrl: string; audioPath: string }`
  - `DesktopAudioEditApi.saveEditedAudio(options): Promise<DesktopAudioEditSaveResult>`
  - Electron IPC channel `audio-edit:save`
  - `registerAudioEditIpcHandlers({ app, ipcMain })`

- [ ] **Step 1: Write the failing structure test**

Append this test to `src/appDesktopIpcStructure.test.ts`:

```ts
test('electron main delegates edited audio persistence to a focused module', () => {
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const desktopApiSource = readFileSync('src/desktopApi.ts', 'utf8')
  const audioEditIpcPath = 'electron/audioEditIpcHandlers.cjs'

  assert.ok(existsSync(audioEditIpcPath), `${audioEditIpcPath} should exist`)
  const audioEditIpcSource = readFileSync(audioEditIpcPath, 'utf8')

  assert.match(mainSource, /registerAudioEditIpcHandlers/)
  assert.doesNotMatch(mainSource, /audio-edit:save/)
  assert.match(audioEditIpcSource, /audio-edit:save/)
  assert.match(audioEditIpcSource, /AudioEdits/)
  assert.match(audioEditIpcSource, /pathToFileURL/)
  assert.match(preloadSource, /saveEditedAudio: \(options\) => invoke\('audio-edit:save', options\)/)
  assert.match(desktopApiSource, /DesktopAudioEditApi/)
})
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
npx tsx --test src/appDesktopIpcStructure.test.ts
```

Expected: FAIL because `electron/audioEditIpcHandlers.cjs` does not exist and `registerAudioEditIpcHandlers` is not wired.

- [ ] **Step 3: Add the desktop API type**

Create `src/desktopAudioEditApi.ts`:

```ts
export interface DesktopAudioEditSaveOptions {
  fileName: string
  data: ArrayBuffer
}

export interface DesktopAudioEditSaveResult {
  fileName: string
  audioUrl: string
  audioPath: string
}

export interface DesktopAudioEditApi {
  saveEditedAudio(options: DesktopAudioEditSaveOptions): Promise<DesktopAudioEditSaveResult>
}
```

Modify `src/desktopApi.ts`:

```ts
import type { DesktopAudioEditApi } from './desktopAudioEditApi'

export type {
  DesktopAudioEditApi,
  DesktopAudioEditSaveOptions,
  DesktopAudioEditSaveResult,
} from './desktopAudioEditApi'

export interface GameDesignToolsDesktopApi extends
  DesktopFileSystemApi,
  DesktopAppUpdateApi,
  DesktopSystemApi,
  DesktopVoiceRuntimeApi,
  DesktopStableAudioRuntimeApi,
  DesktopBirefnetApi,
  DesktopImageEncodingApi,
  DesktopUpscaleApi,
  DesktopProjectProfileApi,
  DesktopProjectRepositoryApi,
  DesktopProjectObjectApi,
  DesktopAudioEditApi {}
```

- [ ] **Step 4: Add the focused IPC handler**

Create `electron/audioEditIpcHandlers.cjs`:

```js
const fsp = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function audioEditOutputDir(app) {
  return path.join(process.env.LOCALAPPDATA || app.getPath('userData'), 'GameDesignTools', 'AudioEdits')
}

function sanitizeAudioEditFileName(fileName) {
  const baseName = path.basename(String(fileName || 'audio-clip.wav'), path.extname(String(fileName || 'audio-clip.wav')))
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${baseName || 'audio-clip'}.wav`
}

function registerAudioEditIpcHandlers({ app, ipcMain }) {
  ipcMain.handle('audio-edit:save', async (_event, options = {}) => {
    const outputDir = audioEditOutputDir(app)
    await fsp.mkdir(outputDir, { recursive: true })
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const safeName = sanitizeAudioEditFileName(options.fileName)
    const outputPath = path.join(outputDir, `${stamp}-${safeName}`)
    await fsp.writeFile(outputPath, Buffer.from(options.data))
    return {
      fileName: path.basename(outputPath),
      audioUrl: pathToFileURL(outputPath).toString(),
      audioPath: outputPath,
    }
  })
}

module.exports = {
  audioEditOutputDir,
  registerAudioEditIpcHandlers,
  sanitizeAudioEditFileName,
}
```

- [ ] **Step 5: Wire preload and main**

Modify `electron/preload.cjs` inside `exposeInMainWorld`:

```js
saveEditedAudio: (options) => invoke('audio-edit:save', options),
```

Modify `electron/main.cjs`:

```js
const {
  registerAudioEditIpcHandlers,
} = require('./audioEditIpcHandlers.cjs')
```

Then register it with the other focused IPC modules:

```js
registerAudioEditIpcHandlers({ app, ipcMain })
```

- [ ] **Step 6: Verify the structure test passes**

Run:

```powershell
npx tsx --test src/appDesktopIpcStructure.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add electron/audioEditIpcHandlers.cjs electron/main.cjs electron/preload.cjs src/desktopApi.ts src/desktopAudioEditApi.ts src/appDesktopIpcStructure.test.ts
git commit -m "Add edited audio persistence bridge"
```

---

### Task 2: Pure Audio Clip Model

**Files:**
- Create: `src/components/VoiceDeploymentWorkspace/audioClipModel.ts`
- Create: `src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts`

**Interfaces:**
- Consumes:
  - `VoiceGenerationRecord`
  - `SoundEffectRecord`
- Produces:
  - `AudioClipSource`
  - `AudioClipRange`
  - `normalizeAudioClipRange(range, durationSeconds): AudioClipRange`
  - `isValidAudioClipRange(range): boolean`
  - `formatAudioClipTime(seconds): string`
  - `createDefaultAudioClipName(source): string`
  - `createVoiceClipRecord(input): VoiceGenerationRecord`
  - `createSoundEffectClipRecord(input): SoundEffectRecord`

- [ ] **Step 1: Write failing model tests**

Create `src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createDefaultAudioClipName,
  createSoundEffectClipRecord,
  createVoiceClipRecord,
  formatAudioClipTime,
  isValidAudioClipRange,
  normalizeAudioClipRange,
} from './audioClipModel'
import type { SoundEffectRecord } from './soundEffectModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'

const voiceRecord: VoiceGenerationRecord = {
  id: 'voice-1',
  name: '旁白',
  createdAt: '2026-07-07T00:00:00.000Z',
  audioUrl: 'file:///voice.wav',
  audioPath: 'D:\\voice.wav',
  params: {
    mode: 'blind-box',
    text: '你好',
    controlInstruction: '',
    promptText: '',
    referenceAudioName: '',
    referenceAudioPath: null,
    advanced: { cfgValue: 2, normalize: false, denoise: false, ditSteps: 10 },
  },
}

const soundRecord: SoundEffectRecord = {
  id: 'sound-1',
  name: '挥剑',
  createdAt: '2026-07-07T00:00:00.000Z',
  audioUrl: 'file:///sound.wav',
  audioPath: 'D:\\sound.wav',
  prompt: 'sword slash',
  durationSeconds: 6,
  seed: 42,
  model: 'small-sfx',
}

test('normalizes clip ranges into source duration bounds', () => {
  assert.deepEqual(normalizeAudioClipRange({ startSeconds: -2, endSeconds: 99 }, 12), {
    startSeconds: 0,
    endSeconds: 12,
  })
  assert.deepEqual(normalizeAudioClipRange({ startSeconds: 8, endSeconds: 3 }, 12), {
    startSeconds: 3,
    endSeconds: 8,
  })
})

test('rejects selected ranges shorter than the minimum clip duration', () => {
  assert.equal(isValidAudioClipRange({ startSeconds: 1, endSeconds: 1.01 }), false)
  assert.equal(isValidAudioClipRange({ startSeconds: 1, endSeconds: 1.08 }), true)
})

test('formats clip times as minute second millisecond labels', () => {
  assert.equal(formatAudioClipTime(65.432), '01:05.432')
})

test('derives default clip output names from source records', () => {
  assert.equal(createDefaultAudioClipName({ sourceKind: 'voice', record: voiceRecord }), '旁白 剪辑')
  assert.equal(createDefaultAudioClipName({ sourceKind: 'sound-effect', record: soundRecord }), '挥剑 剪辑')
})

test('creates voice clip records with preserved voice params and saved audio refs', () => {
  const clipped = createVoiceClipRecord({
    source: { sourceKind: 'voice', record: voiceRecord },
    name: '旁白短句',
    range: { startSeconds: 1, endSeconds: 2.5 },
    savedAudio: { audioUrl: 'file:///clip.wav', audioPath: 'D:\\clip.wav' },
    now: () => '2026-07-07T01:00:00.000Z',
    createId: () => 'clip-voice-1',
  })

  assert.equal(clipped.id, 'clip-voice-1')
  assert.equal(clipped.name, '旁白短句')
  assert.equal(clipped.audioUrl, 'file:///clip.wav')
  assert.equal(clipped.audioPath, 'D:\\clip.wav')
  assert.deepEqual(clipped.params, voiceRecord.params)
})

test('creates sound effect clip records with preserved generation metadata and clipped duration', () => {
  const clipped = createSoundEffectClipRecord({
    source: { sourceKind: 'sound-effect', record: soundRecord },
    name: '挥剑短响',
    range: { startSeconds: 1, endSeconds: 2.25 },
    savedAudio: { audioUrl: 'file:///clip.wav', audioPath: 'D:\\clip.wav' },
    now: () => '2026-07-07T01:00:00.000Z',
    createId: () => 'clip-sound-1',
  })

  assert.equal(clipped.id, 'clip-sound-1')
  assert.equal(clipped.name, '挥剑短响')
  assert.equal(clipped.durationSeconds, 1.25)
  assert.equal(clipped.prompt, soundRecord.prompt)
  assert.equal(clipped.seed, soundRecord.seed)
  assert.equal(clipped.model, soundRecord.model)
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts
```

Expected: FAIL because `audioClipModel.ts` does not exist.

- [ ] **Step 3: Implement the model**

Create `src/components/VoiceDeploymentWorkspace/audioClipModel.ts` with these exported shapes:

```ts
import type { SoundEffectRecord } from './soundEffectModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'

export const minAudioClipDurationSeconds = 0.05

export interface AudioClipRange {
  startSeconds: number
  endSeconds: number
}

export type AudioClipSource =
  | { sourceKind: 'voice'; record: VoiceGenerationRecord }
  | { sourceKind: 'sound-effect'; record: SoundEffectRecord }

export interface SavedAudioClip {
  audioUrl: string
  audioPath: string | null
}

export interface CreateAudioClipRecordInput<TSource extends AudioClipSource> {
  source: TSource
  name: string
  range: AudioClipRange
  savedAudio: SavedAudioClip
  now?: () => string
  createId?: () => string
}

function cleanNumber(value: number) {
  return Number.isFinite(value) ? value : 0
}

function roundedSeconds(value: number) {
  return Math.round(value * 1000) / 1000
}

export function normalizeAudioClipRange(range: AudioClipRange, durationSeconds: number): AudioClipRange {
  const duration = Math.max(0, cleanNumber(durationSeconds))
  const first = Math.max(0, Math.min(duration, cleanNumber(range.startSeconds)))
  const second = Math.max(0, Math.min(duration, cleanNumber(range.endSeconds)))
  return {
    startSeconds: roundedSeconds(Math.min(first, second)),
    endSeconds: roundedSeconds(Math.max(first, second)),
  }
}

export function isValidAudioClipRange(range: AudioClipRange) {
  return range.endSeconds - range.startSeconds >= minAudioClipDurationSeconds
}

export function formatAudioClipTime(seconds: number) {
  const safeSeconds = Math.max(0, cleanNumber(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const wholeSeconds = Math.floor(safeSeconds % 60)
  const milliseconds = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 1000)
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
}

export function createDefaultAudioClipName(source: AudioClipSource) {
  return `${source.record.name.trim() || '未命名音频'} 剪辑`
}

function createRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizedClipName(name: string, source: AudioClipSource) {
  return name.trim() || createDefaultAudioClipName(source)
}

export function createVoiceClipRecord(input: CreateAudioClipRecordInput<{ sourceKind: 'voice'; record: VoiceGenerationRecord }>): VoiceGenerationRecord {
  return {
    id: (input.createId ?? createRandomId)(),
    name: normalizedClipName(input.name, input.source),
    createdAt: (input.now ?? (() => new Date().toISOString()))(),
    audioUrl: input.savedAudio.audioUrl,
    audioPath: input.savedAudio.audioPath,
    params: { ...input.source.record.params, advanced: { ...input.source.record.params.advanced } },
  }
}

export function createSoundEffectClipRecord(input: CreateAudioClipRecordInput<{ sourceKind: 'sound-effect'; record: SoundEffectRecord }>): SoundEffectRecord {
  return {
    id: (input.createId ?? createRandomId)(),
    name: normalizedClipName(input.name, input.source),
    createdAt: (input.now ?? (() => new Date().toISOString()))(),
    audioUrl: input.savedAudio.audioUrl,
    audioPath: input.savedAudio.audioPath,
    prompt: input.source.record.prompt,
    durationSeconds: roundedSeconds(input.range.endSeconds - input.range.startSeconds),
    seed: input.source.record.seed,
    model: input.source.record.model,
  }
}
```

- [ ] **Step 4: Verify model tests pass**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/VoiceDeploymentWorkspace/audioClipModel.ts src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts
git commit -m "Add audio clip record model"
```

---

### Task 3: PCM Slicing And WAV Encoding

**Files:**
- Create: `src/components/VoiceDeploymentWorkspace/audioClipEncoding.ts`
- Create: `src/components/VoiceDeploymentWorkspace/audioClipEncoding.test.ts`

**Interfaces:**
- Produces:
  - `PcmAudioData { sampleRate: number; channelData: Float32Array[] }`
  - `audioBufferToPcmAudioData(audioBuffer: AudioBuffer): PcmAudioData`
  - `slicePcmAudioData(data, range): PcmAudioData`
  - `encodePcmAudioDataToWav(data): Blob`
  - `decodeAudioArrayBuffer(arrayBuffer, audioContext): Promise<PcmAudioData>`

- [ ] **Step 1: Write failing encoding tests**

Create `src/components/VoiceDeploymentWorkspace/audioClipEncoding.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  encodePcmAudioDataToWav,
  slicePcmAudioData,
  type PcmAudioData,
} from './audioClipEncoding'

function readString(view: DataView, offset: number, length: number) {
  return Array.from({ length }, (_, index) => String.fromCharCode(view.getUint8(offset + index))).join('')
}

test('slices PCM audio data by second range', () => {
  const data: PcmAudioData = {
    sampleRate: 4,
    channelData: [
      new Float32Array([0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25]),
      new Float32Array([0, -0.25, -0.5, -0.75, -1, -0.75, -0.5, -0.25]),
    ],
  }

  const sliced = slicePcmAudioData(data, { startSeconds: 0.25, endSeconds: 1.25 })

  assert.equal(sliced.sampleRate, 4)
  assert.deepEqual(Array.from(sliced.channelData[0]), [0.25, 0.5, 0.75, 1])
  assert.deepEqual(Array.from(sliced.channelData[1]), [-0.25, -0.5, -0.75, -1])
})

test('encodes PCM audio data as a 16 bit WAV blob', async () => {
  const data: PcmAudioData = {
    sampleRate: 4,
    channelData: [
      new Float32Array([0, 1, -1, 0.5]),
      new Float32Array([0, -1, 1, -0.5]),
    ],
  }

  const blob = encodePcmAudioDataToWav(data)
  const bytes = await blob.arrayBuffer()
  const view = new DataView(bytes)

  assert.equal(blob.type, 'audio/wav')
  assert.equal(readString(view, 0, 4), 'RIFF')
  assert.equal(readString(view, 8, 4), 'WAVE')
  assert.equal(readString(view, 12, 4), 'fmt ')
  assert.equal(readString(view, 36, 4), 'data')
  assert.equal(view.getUint16(22, true), 2)
  assert.equal(view.getUint32(24, true), 4)
  assert.equal(view.getUint16(34, true), 16)
  assert.equal(view.getUint32(40, true), 16)
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/audioClipEncoding.test.ts
```

Expected: FAIL because `audioClipEncoding.ts` does not exist.

- [ ] **Step 3: Implement encoding helpers**

Create `src/components/VoiceDeploymentWorkspace/audioClipEncoding.ts`:

```ts
import type { AudioClipRange } from './audioClipModel'

export interface PcmAudioData {
  sampleRate: number
  channelData: Float32Array[]
}

export function audioBufferToPcmAudioData(audioBuffer: AudioBuffer): PcmAudioData {
  return {
    sampleRate: audioBuffer.sampleRate,
    channelData: Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => (
      new Float32Array(audioBuffer.getChannelData(index))
    )),
  }
}

export async function decodeAudioArrayBuffer(arrayBuffer: ArrayBuffer, audioContext: AudioContext): Promise<PcmAudioData> {
  return audioBufferToPcmAudioData(await audioContext.decodeAudioData(arrayBuffer.slice(0)))
}

export function slicePcmAudioData(data: PcmAudioData, range: AudioClipRange): PcmAudioData {
  const startFrame = Math.max(0, Math.floor(range.startSeconds * data.sampleRate))
  const endFrame = Math.max(startFrame, Math.floor(range.endSeconds * data.sampleRate))
  return {
    sampleRate: data.sampleRate,
    channelData: data.channelData.map((channel) => channel.slice(startFrame, Math.min(endFrame, channel.length))),
  }
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

function clampSample(value: number) {
  return Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0))
}

export function encodePcmAudioDataToWav(data: PcmAudioData): Blob {
  const channelCount = Math.max(1, data.channelData.length)
  const frameCount = data.channelData[0]?.length ?? 0
  const bytesPerSample = 2
  const blockAlign = channelCount * bytesPerSample
  const byteRate = data.sampleRate * blockAlign
  const dataByteLength = frameCount * blockAlign
  const buffer = new ArrayBuffer(44 + dataByteLength)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataByteLength, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, data.sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataByteLength, true)

  let offset = 44
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = clampSample(data.channelData[channel]?.[frame] ?? 0)
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += bytesPerSample
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}
```

- [ ] **Step 4: Verify encoding tests pass**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/audioClipEncoding.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/VoiceDeploymentWorkspace/audioClipEncoding.ts src/components/VoiceDeploymentWorkspace/audioClipEncoding.test.ts
git commit -m "Add audio clip wav encoding"
```

---

### Task 4: Clip Service And Editor State

**Files:**
- Create: `src/components/VoiceDeploymentWorkspace/audioClipService.ts`
- Create: `src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/audioClipModel.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts`

**Interfaces:**
- Consumes:
  - `DesktopAudioEditApi.saveEditedAudio`
  - `AudioClipSource`
  - `AudioClipRange`
- Produces:
  - `saveAudioClip(input): Promise<AudioClipSaveResult>`
  - `useAudioClipEditorWorkspace({ onVoiceClipCreated, onSoundEffectClipCreated })`
  - `editorPanelProps` for `AudioClipEditorPanel`

- [ ] **Step 1: Add failing source-shaping tests**

Append this to `audioClipModel.test.ts`:

```ts
import { createAudioClipSourceFromSoundEffectRecord, createAudioClipSourceFromVoiceRecord } from './audioClipModel'

test('creates editor sources from voice and sound effect records', () => {
  assert.deepEqual(createAudioClipSourceFromVoiceRecord(voiceRecord), {
    sourceKind: 'voice',
    record: voiceRecord,
  })
  assert.deepEqual(createAudioClipSourceFromSoundEffectRecord(soundRecord), {
    sourceKind: 'sound-effect',
    record: soundRecord,
  })
})
```

- [ ] **Step 2: Run the failing model test**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts
```

Expected: FAIL because source factory functions are not exported.

- [ ] **Step 3: Add source factories**

Add to `audioClipModel.ts`:

```ts
export function createAudioClipSourceFromVoiceRecord(record: VoiceGenerationRecord): AudioClipSource {
  return { sourceKind: 'voice', record }
}

export function createAudioClipSourceFromSoundEffectRecord(record: SoundEffectRecord): AudioClipSource {
  return { sourceKind: 'sound-effect', record }
}
```

- [ ] **Step 4: Add service and hook**

Create `src/components/VoiceDeploymentWorkspace/audioClipService.ts`:

```ts
import type { GameDesignToolsDesktopApi } from '../../desktopApi'
import {
  createSoundEffectClipRecord,
  createVoiceClipRecord,
  isValidAudioClipRange,
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'
import {
  decodeAudioArrayBuffer,
  encodePcmAudioDataToWav,
  slicePcmAudioData,
} from './audioClipEncoding'

export interface SaveAudioClipInput {
  source: AudioClipSource
  range: AudioClipRange
  name: string
  desktopApi: GameDesignToolsDesktopApi | undefined
  createAudioContext?: () => AudioContext
}

export type AudioClipSaveResult =
  | { sourceKind: 'voice'; record: ReturnType<typeof createVoiceClipRecord> }
  | { sourceKind: 'sound-effect'; record: ReturnType<typeof createSoundEffectClipRecord> }

export async function saveAudioClip(input: SaveAudioClipInput): Promise<AudioClipSaveResult> {
  if (!input.desktopApi?.saveEditedAudio) throw new Error('当前桌面运行时不可用，无法保存剪辑音频。')
  if (!isValidAudioClipRange(input.range)) throw new Error('剪辑片段太短，请重新选择有效声音片段。')
  const sourceUrl = input.source.record.audioUrl || input.source.record.audioPath
  if (!sourceUrl) throw new Error('源音频不存在，无法剪辑。')
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`读取源音频失败：${response.status}`)
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  const audioContext = input.createAudioContext?.() ?? new AudioContextCtor()
  const pcm = await decodeAudioArrayBuffer(await response.arrayBuffer(), audioContext)
  const clippedPcm = slicePcmAudioData(pcm, input.range)
  const wav = encodePcmAudioDataToWav(clippedPcm)
  const saved = await input.desktopApi.saveEditedAudio({
    fileName: input.name,
    data: await wav.arrayBuffer(),
  })
  if (input.source.sourceKind === 'voice') {
    return {
      sourceKind: 'voice',
      record: createVoiceClipRecord({ source: input.source, name: input.name, range: input.range, savedAudio: saved }),
    }
  }
  return {
    sourceKind: 'sound-effect',
    record: createSoundEffectClipRecord({ source: input.source, name: input.name, range: input.range, savedAudio: saved }),
  }
}
```

Create `src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts`:

```ts
import { useMemo, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  createDefaultAudioClipName,
  isValidAudioClipRange,
  normalizeAudioClipRange,
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'
import { saveAudioClip } from './audioClipService'
import type { SoundEffectRecord } from './soundEffectModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'

interface UseAudioClipEditorWorkspaceOptions {
  onVoiceClipCreated: (record: VoiceGenerationRecord) => void
  onSoundEffectClipCreated: (record: SoundEffectRecord) => void
}

const defaultRange: AudioClipRange = { startSeconds: 0, endSeconds: 0 }

export function useAudioClipEditorWorkspace({
  onVoiceClipCreated,
  onSoundEffectClipCreated,
}: UseAudioClipEditorWorkspaceOptions) {
  const [messageApi, messageContextHolder] = message.useMessage()
  const [source, setSource] = useState<AudioClipSource | null>(null)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [range, setRange] = useState<AudioClipRange>(defaultRange)
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0)
  const [outputName, setOutputName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const normalizedRange = useMemo(
    () => normalizeAudioClipRange(range, durationSeconds),
    [durationSeconds, range],
  )
  const canSave = Boolean(source) && isValidAudioClipRange(normalizedRange) && !saving

  const loadSource = (nextSource: AudioClipSource) => {
    setSource(nextSource)
    setDurationSeconds(0)
    setRange(defaultRange)
    setCurrentTimeSeconds(0)
    setOutputName(createDefaultAudioClipName(nextSource))
    setError('')
  }

  const saveClip = async () => {
    if (!source || !canSave) return
    setSaving(true)
    setError('')
    try {
      const result = await saveAudioClip({
        source,
        range: normalizedRange,
        name: outputName,
        desktopApi: getDesktopApi(),
      })
      if (result.sourceKind === 'voice') onVoiceClipCreated(result.record)
      else onSoundEffectClipCreated(result.record)
      messageApi.success('已生成新的剪辑音频')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '剪辑音频保存失败。')
    } finally {
      setSaving(false)
    }
  }

  return {
    messageContextHolder,
    hasSource: Boolean(source),
    loadSource,
    panelProps: {
      source,
      durationSeconds,
      range: normalizedRange,
      currentTimeSeconds,
      outputName,
      saving,
      canSave,
      error,
      onDurationChange: setDurationSeconds,
      onRangeChange: (nextRange: AudioClipRange) => setRange(normalizeAudioClipRange(nextRange, durationSeconds)),
      onCurrentTimeChange: setCurrentTimeSeconds,
      onOutputNameChange: setOutputName,
      onSaveClip: () => void saveClip(),
    },
  }
}
```

- [ ] **Step 5: Verify the model test still passes**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run TypeScript build for service typing**

Run:

```powershell
npm run build
```

Expected: PASS. If TypeScript reports `webkitAudioContext`, add a local declaration in `audioClipService.ts`:

```ts
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
```

- [ ] **Step 7: Commit**

```powershell
git add src/components/VoiceDeploymentWorkspace/audioClipModel.ts src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts src/components/VoiceDeploymentWorkspace/audioClipService.ts src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts
git commit -m "Add audio clip save workflow"
```

---

### Task 5: Waveform Editor Panel

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css`
- Modify: `src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css`
- Test: `src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`

**Interfaces:**
- Consumes:
  - `AudioClipSource`
  - `AudioClipRange`
  - `AudioClipEditorPanelProps` from `useAudioClipEditorWorkspace.panelProps`
- Produces:
  - Visual waveform editor with `wavesurfer.js` Regions plugin.

- [ ] **Step 1: Install wavesurfer.js**

Run:

```powershell
npm install wavesurfer.js
```

Expected: `package.json` and `package-lock.json` include `wavesurfer.js`.

- [ ] **Step 2: Write the failing structure test**

Create `src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

test('audio clip editor uses wavesurfer regions and focused editor styling', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')
  const cssHub = read('src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css')

  assert.match(panelSource, /wavesurfer\.js/)
  assert.match(panelSource, /regions/)
  assert.match(panelSource, /剪辑片段/)
  assert.match(panelSource, /生成新音频/)
  assert.match(panelSource, /设为开始/)
  assert.match(panelSource, /设为结束/)
  assert.match(cssHub, /voiceDeployment\.audioEditor\.css/)
})
```

- [ ] **Step 3: Run the failing test**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts
```

Expected: FAIL because the panel and CSS do not exist.

- [ ] **Step 4: Create the editor panel**

Create `src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx` with this structure:

```tsx
import { useEffect, useRef } from 'react'
import { Alert, Button, Empty, Input, InputNumber, Space, Switch, Tag } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined, SaveOutlined, ScissorOutlined, StepBackwardOutlined, StepForwardOutlined } from '@ant-design/icons'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'

import {
  formatAudioClipTime,
  normalizeAudioClipRange,
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'

export interface AudioClipEditorPanelProps {
  source: AudioClipSource | null
  durationSeconds: number
  range: AudioClipRange
  currentTimeSeconds: number
  outputName: string
  saving: boolean
  canSave: boolean
  error: string
  onDurationChange: (seconds: number) => void
  onRangeChange: (range: AudioClipRange) => void
  onCurrentTimeChange: (seconds: number) => void
  onOutputNameChange: (name: string) => void
  onSaveClip: () => void
}

export function AudioClipEditorPanel(props: AudioClipEditorPanelProps) {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const waveSurferRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null)
  const regionRef = useRef<ReturnType<ReturnType<typeof RegionsPlugin.create>['addRegion']> | null>(null)
  const loopSelectionRef = useRef(false)

  useEffect(() => {
    if (!props.source || !waveformRef.current) return
    const regions = RegionsPlugin.create()
    const waveSurfer = WaveSurfer.create({
      container: waveformRef.current,
      url: props.source.record.audioUrl,
      height: 92,
      normalize: true,
      waveColor: '#8ea0ba',
      progressColor: '#315fba',
      cursorColor: '#1c2b4a',
      plugins: [regions],
    })
    waveSurferRef.current = waveSurfer
    regionsRef.current = regions

    waveSurfer.on('ready', () => {
      const duration = waveSurfer.getDuration()
      props.onDurationChange(duration)
      const initialRange = normalizeAudioClipRange({ startSeconds: 0, endSeconds: Math.min(duration, 3) }, duration)
      props.onRangeChange(initialRange)
      regionRef.current = regions.addRegion({
        start: initialRange.startSeconds,
        end: initialRange.endSeconds,
        color: 'rgba(49, 95, 186, 0.18)',
        drag: true,
        resize: true,
      })
    })
    waveSurfer.on('timeupdate', props.onCurrentTimeChange)
    regions.on('region-updated', (region) => {
      props.onRangeChange({ startSeconds: region.start, endSeconds: region.end })
    })
    regions.on('region-out', (region) => {
      if (loopSelectionRef.current) region.play()
    })
    return () => {
      waveSurfer.destroy()
      waveSurferRef.current = null
      regionsRef.current = null
      regionRef.current = null
    }
  }, [props.source?.record.id])

  const playSelection = () => {
    const region = regionRef.current
    if (region) region.play()
  }

  const setStartAtCurrentTime = () => {
    props.onRangeChange({ ...props.range, startSeconds: props.currentTimeSeconds })
  }

  const setEndAtCurrentTime = () => {
    props.onRangeChange({ ...props.range, endSeconds: props.currentTimeSeconds })
  }

  if (!props.source) {
    return (
      <section className="voice-panel audio-editor-panel" aria-labelledby="audio-editor-title">
        <div className="panel-title">
          <ScissorOutlined />
          <h3 id="audio-editor-title">音频编辑</h3>
        </div>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="从生成配音或生成音效的历史记录中选择“剪辑片段”" />
      </section>
    )
  }

  return (
    <section className="voice-panel audio-editor-panel" aria-labelledby="audio-editor-title">
      <div className="panel-title">
        <ScissorOutlined />
        <h3 id="audio-editor-title">音频编辑</h3>
      </div>

      <div className="audio-editor-source-row">
        <Tag>{props.source.sourceKind === 'voice' ? '配音' : '音效'}</Tag>
        <strong>{props.source.record.name}</strong>
        <span>{formatAudioClipTime(props.durationSeconds)}</span>
      </div>

      <div className="audio-waveform" ref={waveformRef} />

      <div className="audio-editor-controls">
        <Button icon={<PlayCircleOutlined />} onClick={() => waveSurferRef.current?.playPause()}>
          播放源音频
        </Button>
        <Button icon={<PauseCircleOutlined />} onClick={() => waveSurferRef.current?.pause()}>
          暂停
        </Button>
        <Button icon={<PlayCircleOutlined />} onClick={playSelection}>
          播放片段
        </Button>
        <span className="audio-editor-loop">
          循环片段 <Switch size="small" onChange={(checked) => { loopSelectionRef.current = checked }} />
        </span>
      </div>

      <div className="audio-editor-time-grid">
        <label>
          <span>开始</span>
          <InputNumber min={0} max={props.durationSeconds} step={0.01} value={props.range.startSeconds} onChange={(value) => props.onRangeChange({ ...props.range, startSeconds: Number(value) || 0 })} />
        </label>
        <label>
          <span>结束</span>
          <InputNumber min={0} max={props.durationSeconds} step={0.01} value={props.range.endSeconds} onChange={(value) => props.onRangeChange({ ...props.range, endSeconds: Number(value) || 0 })} />
        </label>
        <label>
          <span>当前</span>
          <strong>{formatAudioClipTime(props.currentTimeSeconds)}</strong>
        </label>
        <label>
          <span>片段</span>
          <strong>{formatAudioClipTime(props.range.endSeconds - props.range.startSeconds)}</strong>
        </label>
      </div>

      <Space wrap>
        <Button icon={<StepBackwardOutlined />} onClick={setStartAtCurrentTime}>设为开始</Button>
        <Button icon={<StepForwardOutlined />} onClick={setEndAtCurrentTime}>设为结束</Button>
      </Space>

      <div className="audio-editor-save-row">
        <Input value={props.outputName} aria-label="剪辑音频名称" onChange={(event) => props.onOutputNameChange(event.target.value)} />
        <Button type="primary" icon={<SaveOutlined />} loading={props.saving} disabled={!props.canSave} onClick={props.onSaveClip}>
          生成新音频
        </Button>
      </div>

      {props.error ? <Alert type="warning" showIcon title={props.error} /> : null}
    </section>
  )
}
```

- [ ] **Step 5: Add compact editor CSS**

Create `src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css`:

```css
.audio-editor-panel {
  display: grid;
  gap: 12px;
}

.audio-editor-source-row,
.audio-editor-controls,
.audio-editor-save-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.audio-editor-source-row strong {
  min-width: 0;
  overflow-wrap: anywhere;
}

.audio-waveform {
  min-height: 96px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-panel-strong);
  overflow: hidden;
}

.audio-editor-loop {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: 0.88rem;
}

.audio-editor-time-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 10px;
}

.audio-editor-time-grid label {
  display: grid;
  gap: 4px;
  color: var(--color-muted);
  font-size: 0.82rem;
}

.audio-editor-time-grid strong {
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}

.audio-editor-save-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
}

@media (max-width: 760px) {
  .audio-editor-time-grid,
  .audio-editor-save-row {
    grid-template-columns: 1fr;
  }
}
```

Modify `src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css`:

```css
@import './voiceDeployment.audioEditor.css';
```

- [ ] **Step 6: Verify the structure test passes**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts
```

Expected: PASS.

- [ ] **Step 7: Build to catch wavesurfer typing issues**

Run:

```powershell
npm run build
```

Expected: PASS. If the Regions plugin region type is not exported cleanly, replace the `regionRef` type with:

```ts
const regionRef = useRef<{ play: () => void; start: number; end: number } | null>(null)
```

- [ ] **Step 8: Commit**

```powershell
git add package.json package-lock.json src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts
git commit -m "Add waveform audio clip editor panel"
```

---

### Task 6: Wire Voice And Sound Histories Into The Editor Tab

**Files:**
- Modify: `src/components/VoiceDeploymentWorkspace/index.tsx`
- Modify: `src/components/VoiceDeploymentWorkspace/VoiceWorkspaceTabs.tsx`
- Modify: `src/components/VoiceDeploymentWorkspace/VoiceLibraryPanel.tsx`
- Modify: `src/components/VoiceDeploymentWorkspace/VoiceRecordLists.tsx`
- Modify: `src/components/VoiceDeploymentWorkspace/SoundEffectLibraryPanel.tsx`
- Modify: `src/components/VoiceDeploymentWorkspace/useVoiceDeploymentWorkspace.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts`
- Modify: `src/voiceDeploymentSoundStructure.test.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`

**Interfaces:**
- Consumes:
  - `useAudioClipEditorWorkspace`
  - `AudioClipEditorPanel`
  - `createAudioClipSourceFromVoiceRecord`
  - `createAudioClipSourceFromSoundEffectRecord`
- Produces:
  - Controlled tab key union: `'voice' | 'sound' | 'audio-edit'`
  - `onClip` action in both history panels

- [ ] **Step 1: Write failing wiring tests**

Append this to `src/voiceDeploymentSoundStructure.test.ts`:

```ts
test('voice workspace exposes an audio editor tab and sound records can open clip editing', () => {
  const indexSource = read(files.index)
  const tabsSource = read(files.tabs)
  const librarySource = read(files.library)

  assert.match(indexSource, /useAudioClipEditorWorkspace/)
  assert.match(indexSource, /AudioClipEditorPanel/)
  assert.match(tabsSource, /音频编辑/)
  assert.match(tabsSource, /activeKey/)
  assert.match(librarySource, /剪辑片段/)
  assert.match(librarySource, /onClip/)
})
```

Append this to `src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`:

```ts
test('voice history records can open clip editing', () => {
  const voiceLibrarySource = read('src/components/VoiceDeploymentWorkspace/VoiceLibraryPanel.tsx')
  const voiceRecordListSource = read('src/components/VoiceDeploymentWorkspace/VoiceRecordLists.tsx')

  assert.match(voiceLibrarySource, /onClip/)
  assert.match(voiceRecordListSource, /剪辑片段/)
  assert.match(voiceRecordListSource, /ScissorOutlined/)
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npx tsx --test src/voiceDeploymentSoundStructure.test.ts src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts
```

Expected: FAIL because the new tab and clip actions are not wired.

- [ ] **Step 3: Expose record insertion callbacks from hooks**

Modify `useVoiceDeploymentWorkspace.ts` return object:

```ts
audioClipActions: {
  addVoiceClipRecord: recordLibrary.addRecord,
},
```

Modify `useSoundEffectWorkspace.ts` return object:

```ts
audioClipActions: {
  addSoundEffectClipRecord: recordLibrary.addRecord,
},
```

- [ ] **Step 4: Add voice history clip action**

Modify `VoiceRecordLists.tsx` imports:

```tsx
import { DeleteOutlined, DownOutlined, ScissorOutlined } from '@ant-design/icons'
```

Add to `VoiceRecordListProps`:

```ts
onClip: (record: VoiceGenerationRecord) => void
```

Render a small button before collect actions:

```tsx
<Button size="small" icon={<ScissorOutlined />} onClick={() => onClip(record)}>剪辑片段</Button>
```

Modify `VoiceLibraryPanel.tsx` props:

```ts
onClip: (record: VoiceGenerationRecord) => void
```

Pass it into `VoiceRecordList`:

```tsx
onClip={onClip}
```

- [ ] **Step 5: Add sound effect history clip action**

Modify `SoundEffectLibraryPanel.tsx` imports:

```tsx
ScissorOutlined,
```

Add to `SoundEffectLibraryPanelProps`:

```ts
onClip: (record: SoundEffectRecord) => void
```

Render the action near `载入参数`:

```tsx
<Button size="small" icon={<ScissorOutlined />} onClick={() => onClip(record)}>
  剪辑片段
</Button>
```

- [ ] **Step 6: Make workspace tabs controlled and add editor tab**

Modify `VoiceWorkspaceTabs.tsx` props:

```tsx
type VoiceWorkspaceTabKey = 'voice' | 'sound' | 'audio-edit'

interface VoiceWorkspaceTabsProps {
  activeKey: VoiceWorkspaceTabKey
  voiceContent: ReactNode
  soundWorkspace: SoundEffectWorkspaceState
  audioEditorContent: ReactNode
  onChange: (key: VoiceWorkspaceTabKey) => void
  onClipSoundEffect: (record: SoundEffectRecord) => void
}
```

Configure `<Tabs>`:

```tsx
<Tabs
  className="voice-workspace-tabs"
  activeKey={activeKey}
  onChange={(key) => onChange(key as VoiceWorkspaceTabKey)}
  items={[
    { key: 'voice', label: '生成配音', children: voiceContent },
    {
      key: 'sound',
      label: '生成音效',
      children: (
        <div className="sound-workbench">
          <SoundEffectSetupPanel {...soundWorkspace.setupPanelProps} />
          <div className="sound-studio">
            <SoundEffectGenerationPanel {...soundWorkspace.generationPanelProps} />
            <SoundEffectLibraryPanel {...soundWorkspace.libraryPanelProps} onClip={onClipSoundEffect} />
          </div>
        </div>
      ),
    },
    { key: 'audio-edit', label: '音频编辑', children: audioEditorContent },
  ]}
/>
```

- [ ] **Step 7: Connect index.tsx**

Modify `index.tsx`:

```tsx
import { useState } from 'react'
import { AudioClipEditorPanel } from './AudioClipEditorPanel'
import {
  createAudioClipSourceFromSoundEffectRecord,
  createAudioClipSourceFromVoiceRecord,
} from './audioClipModel'
import { useAudioClipEditorWorkspace } from './useAudioClipEditorWorkspace'
import type { SoundEffectRecord } from './soundEffectModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'
```

Inside `VoiceDeploymentWorkspace`:

```tsx
const [activeTab, setActiveTab] = useState<'voice' | 'sound' | 'audio-edit'>('voice')
const workspace = useVoiceDeploymentWorkspace()
const soundWorkspace = useSoundEffectWorkspace()
const audioClipEditor = useAudioClipEditorWorkspace({
  onVoiceClipCreated: workspace.audioClipActions.addVoiceClipRecord,
  onSoundEffectClipCreated: soundWorkspace.audioClipActions.addSoundEffectClipRecord,
})

const openVoiceClipEditor = (record: VoiceGenerationRecord) => {
  audioClipEditor.loadSource(createAudioClipSourceFromVoiceRecord(record))
  setActiveTab('audio-edit')
}

const openSoundClipEditor = (record: SoundEffectRecord) => {
  audioClipEditor.loadSource(createAudioClipSourceFromSoundEffectRecord(record))
  setActiveTab('audio-edit')
}
```

Pass `onClip` into `VoiceLibraryPanel`:

```tsx
<VoiceLibraryPanel
  libraryVariant={libraryVariant}
  {...workspace.libraryPanelProps}
  onClip={openVoiceClipEditor}
/>
```

Add editor content and controlled tabs:

```tsx
const audioEditorContent = (
  <>
    {audioClipEditor.messageContextHolder}
    <AudioClipEditorPanel {...audioClipEditor.panelProps} />
  </>
)

<VoiceWorkspaceTabs
  activeKey={activeTab}
  onChange={setActiveTab}
  voiceContent={voiceContent}
  soundWorkspace={soundWorkspace}
  audioEditorContent={audioEditorContent}
  onClipSoundEffect={openSoundClipEditor}
/>
```

- [ ] **Step 8: Verify wiring tests pass**

Run:

```powershell
npx tsx --test src/voiceDeploymentSoundStructure.test.ts src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts
```

Expected: PASS.

- [ ] **Step 9: Build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 10: Commit**

```powershell
git add src/components/VoiceDeploymentWorkspace/index.tsx src/components/VoiceDeploymentWorkspace/VoiceWorkspaceTabs.tsx src/components/VoiceDeploymentWorkspace/VoiceLibraryPanel.tsx src/components/VoiceDeploymentWorkspace/VoiceRecordLists.tsx src/components/VoiceDeploymentWorkspace/SoundEffectLibraryPanel.tsx src/components/VoiceDeploymentWorkspace/useVoiceDeploymentWorkspace.ts src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts src/voiceDeploymentSoundStructure.test.ts src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts
git commit -m "Wire audio clip editor into voice histories"
```

---

### Task 7: Final Verification And Browser QA

**Files:**
- Modify only files required by failures found during verification.

**Interfaces:**
- Consumes:
  - All previous task outputs.
- Produces:
  - Verified implementation with working local UI.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts src/components/VoiceDeploymentWorkspace/audioClipEncoding.test.ts src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts src/voiceDeploymentSoundStructure.test.ts src/appDesktopIpcStructure.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full test gate**

Run:

```powershell
npm test
```

Expected: PASS with `# fail 0`.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run whitespace check**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 5: Run browser QA**

Start a dev server on a free port:

```powershell
npm run dev -- --host 127.0.0.1 --port 5180
```

Verify in the browser:

- `配音工作台` shows `生成配音`, `生成音效`, and `音频编辑` tabs.
- Voice history records show `剪辑片段`.
- Sound effect history records show `剪辑片段`.
- Opening a record switches to `音频编辑`.
- The editor empty state appears when no record has been selected.
- The editor layout remains compact at desktop width and does not overflow at mobile width.

- [ ] **Step 6: Manual audio save check with an existing record**

Use an existing generated voice or sound effect record:

1. Click `剪辑片段`.
2. Wait for the waveform.
3. Drag the region handles.
4. Play the selected region.
5. Enter a new name.
6. Click `生成新音频`.
7. Confirm the new record appears in the same source history.
8. Refresh the app and confirm the new record still plays.

- [ ] **Step 7: Commit final fixes**

If verification required changes:

```powershell
git add <changed-files>
git commit -m "Polish audio clip editor"
```

If no changes were needed, do not create an empty commit.

---

## Self-Review

- Spec coverage: Tasks cover wavesurfer waveform interaction, Web Audio slicing, WAV encoding, Electron persistence, voice history output, sound effect history output, explicit errors, compact UI, structure tests, and manual verification.
- Placeholder scan: The plan avoids placeholder tokens and names concrete files, signatures, commands, and expected outcomes.
- Type consistency: `AudioClipSource`, `AudioClipRange`, `SavedAudioClip`, `DesktopAudioEditApi`, and the result record callbacks are introduced before the tasks that consume them.
