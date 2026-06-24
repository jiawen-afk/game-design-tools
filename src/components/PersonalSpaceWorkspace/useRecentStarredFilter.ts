import { useEffect, useState } from 'react'

import type { PersonalSpaceFilterOption } from './PersonalSpaceFilterControl'

interface UseRecentStarredFilterParams<T> {
  items: T[]
  defaultValue: string
  defaultLabel: string
  getId: (item: T) => string
  getName: (item: T) => string
  getStarred: (item: T) => boolean | undefined
}

export function useRecentStarredFilter<T>({
  items,
  defaultValue,
  defaultLabel,
  getId,
  getName,
  getStarred,
}: UseRecentStarredFilterParams<T>) {
  const [selectedFilter, setSelectedFilter] = useState(defaultValue)
  const [onlyStarred, setOnlyStarred] = useState(false)
  const starFilteredItems = onlyStarred ? items.filter((item) => getStarred(item)) : items
  const recentFilterOptions = starFilteredItems.slice(-20).reverse()
  const filterOptions: PersonalSpaceFilterOption[] = [
    { label: defaultLabel, value: defaultValue },
    ...items.map((item) => ({ label: getName(item), value: getId(item) })),
  ]
  const visibleItems = selectedFilter === defaultValue
    ? recentFilterOptions
    : starFilteredItems.filter((item) => getId(item) === selectedFilter)

  useEffect(() => {
    if (selectedFilter !== defaultValue && !items.some((item) => getId(item) === selectedFilter)) {
      setSelectedFilter(defaultValue)
    }
  }, [defaultValue, getId, items, selectedFilter])

  return {
    selectedFilter,
    setSelectedFilter,
    onlyStarred,
    setOnlyStarred,
    filterOptions,
    visibleItems,
  }
}
