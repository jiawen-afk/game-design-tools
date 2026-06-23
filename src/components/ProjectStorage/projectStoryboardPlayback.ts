export interface StoryboardPlaybackInput {
  id: string
  durationUs: number
  startOffsetUs: number
}

export interface StoryboardPlaybackScheduleItem {
  id: string
  startAtUs: number
  endAtUs: number
}

export function scheduleStoryboardVoiceStarts(entries: StoryboardPlaybackInput[]): StoryboardPlaybackScheduleItem[] {
  const schedule: StoryboardPlaybackScheduleItem[] = []
  let previousEndUs = 0

  for (const entry of entries) {
    const startAtUs = Math.max(0, previousEndUs + Math.trunc(entry.startOffsetUs))
    const endAtUs = startAtUs + Math.max(0, Math.trunc(entry.durationUs))
    schedule.push({ id: entry.id, startAtUs, endAtUs })
    previousEndUs = endAtUs
  }

  return schedule
}
