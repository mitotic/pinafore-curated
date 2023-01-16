import { store } from '../_store/store.js'

import { auth, basename } from '../_api/utils.js'
import { getWithHeaders, DEFAULT_TIMEOUT } from '../_utils/ajax.js'
import li from 'li'
import { scheduleCurationCleanup } from '../_database/cleanup.js'

import { date2hhmmISO, offsetDaysInDate } from './curationStore.js'
import { createSnowflakeId, getSnowflakeEpoch } from './curationSnowflakeId.js'
import { computePostStats } from './curationStats.js'

import { MAHOOT_DATA_VERSION, UPDATE_DELAY_SEC, PAGED_REQUEST_DELAY_SEC, RETRY_UPDATE_SEC, STATUS_REQUEST_LIMIT, nextInterval, oldestInterval, getMaxDaysOfData, summarizeStatus, bufferStatusSummarySync, getEditionTimeStrs } from './curationGeneral.js'

import { getAllSummaryKeysRange, removeSummariesBefore, putEditionStatus, deleteOldEditionStatuses, getCurrentFollows, getFilter } from './curationCache.js'
import { curateSingleStatus } from './curationFilter.js'
import { refreshCurationFollows } from './curationFollows.js'

// Shown/Dropped/Saved post counters (initially 0 and reset to 1 at local midnoght)
export let CurationCounter = {}

function getHomeTimelineURL (limit, minId) {
  const { currentInstance } = store.get()
  return `${basename(currentInstance)}/api/v1/timelines/home?limit=${limit}&min_id=${minId}`
}

let UpdateSequenceId = 0

export async function updateStatusBuffer (callType) {
  const { loggedInInstances, currentInstance } = store.get()
  const { curationDevMode, curationDisabled, curationLastSaveInterval } = store.get()

  let { curationUpdatingRecent, curationUpdatingBuffer } = store.get()

  console.log('updateStatusBuffer: CALLED', callType, curationUpdatingBuffer, curationLastSaveInterval, curationDisabled)

  if (curationDisabled) {
    return
  }

  if (curationUpdatingBuffer) {
    console.log('updateStatusBuffer: ALREADY UPDATING SINCE', curationUpdatingBuffer)
    return
  }

  let newIntervalStr
  if (curationLastSaveInterval) {
    newIntervalStr = nextInterval(curationLastSaveInterval)

    if (callType && callType === 'force') {
      // Immediate update requested

    } else {
      // If periodic call, wait for a few minutes into the new interval to update (allowing time for a new post to appear)
      const delaySec = !callType ? UPDATE_DELAY_SEC : 0

      if (new Date(nextInterval(newIntervalStr)).getTime() > Date.now() - delaySec * 1000) {
        if (!callType || callType === 'init') {
          // Periodic call; update stats
          CurationCounter = (await computePostStats()) || {}
        }
        console.log('updateStatusBuffer: No new interval yet')
        return
      }
    }

    console.log('updateStatusBuffer: New interval from', curationLastSaveInterval, newIntervalStr)
  } else {
    // Start from 0Z for the previous day (at least 24 hours earlier)
    const dateObj = new Date()
    dateObj.setDate(dateObj.getDate() - 1)
    const dayBeforeStr = dateObj.toISOString().split('T')[0]

    newIntervalStr = dayBeforeStr + 'T00:00Z'
    console.log('updateStatusBuffer: First interval from', newIntervalStr)
  }

  if (curationUpdatingRecent && (Date.now() < new Date(curationUpdatingRecent).getTime() + RETRY_UPDATE_SEC * 1000)) {
    // Recently started update; wait before next update attempt
    console.log('updateStatusBuffer: RECENT UPDATE AT', curationUpdatingRecent)
    return
  }

  curationUpdatingRecent = date2hhmmISO()
  curationUpdatingBuffer = new Date().toString()
  store.set({ curationUpdatingRecent, curationUpdatingBuffer })

  UpdateSequenceId += 1
  const sequenceInfo = 'Status' + (curationDevMode ? ': Seq' + UpdateSequenceId + (callType ? '(' + callType + ')' : '') : '')

  try {
    await refreshCurationFollows()

    const minId = createSnowflakeId(newIntervalStr, 0)

    const url = getHomeTimelineURL(1, minId)
    const accessToken = loggedInInstances[currentInstance].access_token

    console.log('updateStatusBuffer-START', sequenceInfo)

    const statusBlock = []
    await processPagedStatuses(sequenceInfo, 0, newIntervalStr, statusBlock, url, accessToken, true)
    // Note: only the first call to processPagedStatuses would have completed here; others will be delayed
  } catch (err) {
    console.log('updateStatusBuffer: ABORTED', sequenceInfo, err)
  } finally {
    store.set({ curationUpdatingBuffer: '' })
  }

  console.log('updateStatusBuffer: DONE', sequenceInfo, getMaxDaysOfData())
}

async function processPagedStatuses (sequenceInfo, processedCount, lastIntervalStr, statusBlock, url, accessToken, start) {
  const { json: items, headers } = await getWithHeaders(url, auth(accessToken), { timeout: DEFAULT_TIMEOUT })
  items.reverse()

  const updateMsg = sequenceInfo + ': Processing ' + processedCount + ' items at ' + new Date(lastIntervalStr).toLocaleString()
  store.set({ curationUpdatingMessage: updateMsg })
  console.log('processPagedStatuses-BEGIN', lastIntervalStr, updateMsg)

  let getUrl
  if (start) {
    if (items.length !== 1) {
      console.log('processPagedStatuses ERROR failed to start')
      store.set({ curationUpdatingMessage: '' })
      return
    }
    const firstAvailableTime = getSnowflakeEpoch(items[0].id)

    while ((new Date(nextInterval(lastIntervalStr))).getTime() < firstAvailableTime) { lastIntervalStr = nextInterval(lastIntervalStr) }

    const minId = createSnowflakeId(lastIntervalStr, 0)
    getUrl = getHomeTimelineURL(STATUS_REQUEST_LIMIT, minId)
  } else {
    const linkHeader = headers.get('Link')
    const parsedLinkHeader = li.parse(linkHeader)
    getUrl = parsedLinkHeader && parsedLinkHeader.prev

    lastIntervalStr = await saveStatuses(lastIntervalStr, statusBlock, items)
  }

  processedCount += items.length

  if (lastIntervalStr && getUrl) {
    // Mastodon: limit of 300 requests over 15 minutes for paged data => 3 sec or more delay
    setTimeout(() => processPagedStatuses(sequenceInfo, processedCount, lastIntervalStr, statusBlock, getUrl, accessToken, false), PAGED_REQUEST_DELAY_SEC * 1000)
  } else {
    console.log('processPagedStatuses-FINAL', lastIntervalStr, Object.keys(CurationCounter).length)

    store.set({ curationUpdatingMessage: '' })

    CurationCounter = (await computePostStats()) || {}
  }
}

async function saveStatuses (lastIntervalStr, statusBlock, statuses) {
  // Return updated lastIntervalStr or '' to stop
  /// console.log('saveStatuses', lastIntervalStr, statusBlock.length, statuses.length)

  let nextIntervalStr = nextInterval(lastIntervalStr)
  let nextIntervalTime = (new Date(nextIntervalStr)).getTime()

  const currentFollows = getCurrentFollows()

  for (const status of statuses) {
    const statusTime = getSnowflakeEpoch(status.id)

    if (statusTime < nextIntervalTime) {
      statusBlock.push(status)
    } else {
      console.log('saveStatuses-interval', lastIntervalStr, nextIntervalStr)
      if (statusBlock.length) {
        // Process completed interval
        store.set({ curationDataVersion: MAHOOT_DATA_VERSION })

        await processStatusBlock(currentFollows, lastIntervalStr, statusBlock.slice())

        store.set({ curationLastSaveInterval: lastIntervalStr })

        // Delete all processed statuses
        statusBlock.splice(0, statusBlock.length)

        // Cleanup old statuses and cleanup buffers
        const oldestIntervalStr = oldestInterval(lastIntervalStr)

        /// getAllSummaryKeysBefore(oldestIntervalStr).then(keys => {
        /// console.log('saveStatuses REMOVE STATUSES', keys.length, oldestIntervalStr)
        /// })
        removeSummariesBefore(oldestIntervalStr)

        const oldestEditionTime = offsetDaysInDate(lastIntervalStr, -2)
        deleteOldEditionStatuses(createSnowflakeId(oldestEditionTime))

        scheduleCurationCleanup()
      }

      lastIntervalStr = nextIntervalStr
      nextIntervalStr = nextInterval(lastIntervalStr)
      nextIntervalTime = (new Date(nextIntervalStr)).getTime()
      if (nextIntervalTime > Date.now()) {
        // Incomplete interval; stop
        console.log('saveStatuses2')
        return ''
      }
      // console.log('saveStatuses2-created_at', status.created_at)
    }
  }

  return lastIntervalStr
}

async function processStatusBlock (currentFollows, lastIntervalStr, statusBlock) {
  const { currentInstance } = store.get()

  const editionCount = getEditionTimeStrs().length
  const currentFilter = getFilter()
  const [currentStats, currentProbs] = currentFilter || [null, null]

  const oldKeys = (await getAllSummaryKeysRange(lastIntervalStr, nextInterval(lastIntervalStr))) || []

  console.log('processStatusBlock', lastIntervalStr, statusBlock.length, oldKeys.length)

  for (const status of statusBlock) {
    if (oldKeys.includes(status.id)) {
      // Status already buffered
      continue
    }

    const statusSummary = summarizeStatus(status)

    // Sync the buffer save so that statistics can be computed at the end of buffer update
    await bufferStatusSummarySync(currentFollows, statusSummary)

    const modStatus = curateSingleStatus(statusSummary, currentInstance, currentFollows, currentStats, currentProbs, editionCount)
    if (modStatus.curation_save) {
      // Can be async
      putEditionStatus({ ...status, ...{ curation_save: modStatus.curation_save, curation_tag: modStatus.curation_tag || '' } })
    }
  }
}
