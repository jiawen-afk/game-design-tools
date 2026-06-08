export function includesKeyword(values: Array<string | undefined>, keyword: string) {
  const cleanKeyword = keyword.trim().toLowerCase()
  if (!cleanKeyword) return true
  return values.some((value) => value?.toLowerCase().includes(cleanKeyword))
}
