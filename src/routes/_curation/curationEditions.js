import { store } from '../_store/store.js'
import { storeFreshTimelineItemsInDatabase, addTimelineItems } from '../_actions/timeline.js'

import { localTime2hhmm } from '../_curation/curationStore.js'
import { getEditionTimeStrs } from '../_curation/curationGeneral.js'
import { reblogEditionStatuses } from '../_curation/curationTimeline.js'

export function getLastEditionTimes () {
  const editionTimeStrs = getEditionTimeStrs()
  const editionCount = editionTimeStrs.length
  if (!editionCount) {
    return ['', '']
  }
  let lastEdition = editionTimeStrs.slice(-1)[0]
  const hhmm = localTime2hhmm()

  let j = 0
  for (const timeStr of editionTimeStrs) {
    if (hhmm < timeStr) {
      lastEdition = j ? editionTimeStrs[j - 1] : lastEdition
      break
    }
    j += 1
  }
  const prevEdition = (editionCount < 2) ? lastEdition : editionTimeStrs[(j + editionCount - 2) % editionCount]

  return [lastEdition, prevEdition]
}

export async function insertEditionNow (lastEdition, prevEdition) {
  const { currentInstance } = store.get()
  const items = await reblogEditionStatuses(' ' + lastEdition, lastEdition, prevEdition)
  console.log('insertEditionNow', lastEdition, prevEdition, items)
  if (items && items.length) {
    await storeFreshTimelineItemsInDatabase(currentInstance, 'home', items)
    await addTimelineItems(currentInstance, 'home', items, false)
  }
  return true
}
