import { store } from '../_store/store.js'
import { database } from '../_database/database.js'
import { getStatus } from '../_api/statuses.js'

import { createSnowflakeId, getSnowflakeEpoch, getSnowflakeDate } from './curationSnowflakeId.js'
import { MOTX_TAG, hhmm2localTime, date2hhmmISO, zeropad } from './curationStore.js'
import { curatorReblog } from './curationUser.js'
import { updateStatusBuffer } from './curationBuffer.js'

import { PREFILL_STATUSBUFFER, getCurrentFollows, getFilter, putEditionStatus, getAllEditionStatuses } from './curationCache.js'

import { nextInterval, getEditionLayout, getEditionTimeStrs, summarizeStatus, bufferStatusSummaryAsync } from './curationGeneral.js'

import { curateSingleStatus } from './curationFilter.js'

function editionLabel (status, display) {
  // Section names are of the form #motx or *[name]
  const username = status.account.acct.toLowerCase()
  const section = status.curation_save || '#'
  const editionLayout = getEditionLayout()

  let sectionIndex = '9999'
  let userIndex = '9999'
  if (section === '#' + MOTX_TAG) {
    // #MOTx posts always appear first in the edition (to motivate their use)
    // #MOTx posts will be sorted by username and then post time
    sectionIndex = zeropad(0, sectionIndex.length) // 0000
  } else {
    if (editionLayout[section]) {
      sectionIndex = zeropad(editionLayout[section].index, sectionIndex.length)
    }
    if (editionLayout[username]) {
      userIndex = zeropad(editionLayout[username].index, userIndex.length)
    }
  }
  // Sort by section index, then section name, then user index, then username then post time
  const label = display ? section : sectionIndex + '/' + section + '/' + userIndex + '@' + username + '-' + date2hhmmISO(getSnowflakeDate(status.id))
  return label
}

export async function updateEditionStats () {
  const editionTimeStrs = getEditionTimeStrs()
  const editionCount = editionTimeStrs.length

  let curationEditionStats
  if (!editionTimeStrs.length) {
    curationEditionStats = 'none'
  } else {
    let maxEditionId = '0'
    const editionStats = []
    for (const [j, editionTimeStr] of editionTimeStrs.entries()) {
      const editionTime = hhmm2localTime(editionTimeStr)
      const editionId = createSnowflakeId(editionTime)
      const startTimeStr = editionTimeStrs[(j + editionCount - 1) % editionCount] // Prev edition time
      const startTime = hhmm2localTime(startTimeStr, editionTime.getTime())
      const startId = createSnowflakeId(startTime)

      const editionStatuses = await getAllEditionStatuses(startId, editionId)
      editionStats.push(editionTimeStr + ' (' + editionStatuses.length + ')')
      maxEditionId = maxEditionId >= editionId ? maxEditionId : editionId
    }
    const recentEditionStatuses = await getAllEditionStatuses(maxEditionId, createSnowflakeId())
    curationEditionStats = editionStats.join(', ') + ' [next: *' + recentEditionStatuses.length + ']'
  }
  store.set({ curationEditionStats })
}

export async function reblogEditionStatuses (nameSuffix, editionTimeStr, prevEditionTimeStr, aboveEditionId) {
  // If aboveEditionId not specified, use current time to create it
  const displayTime = aboveEditionId ? hhmm2localTime(editionTimeStr) : new Date()

  const endTime = hhmm2localTime(editionTimeStr)
  const endId = createSnowflakeId(endTime)
  const startTime = hhmm2localTime(prevEditionTimeStr, endTime.getTime())
  const startId = createSnowflakeId(startTime)

  const editionStatuses = await getAllEditionStatuses(startId, endId)

  if (aboveEditionId) {
    const displayIdMax = createSnowflakeId(displayTime, editionStatuses.length)

    if (!editionStatuses.length || aboveEditionId <= displayIdMax) {
      // Empty edition or rare overlap between edition reblog Ids and Id of the status to be displayed above the edition
      return null
    }
  }

  const rebloggedStatuses = []
  editionStatuses.sort((a, b) => (editionLabel(a) > editionLabel(b)) ? 1 : -1)

  console.log('reblogEditionStatuses NEW-EDITION', nameSuffix, editionStatuses.length, displayTime)

  const editionName = '𝔇𝔞𝔦𝔩𝔶 𝔈𝔡𝔦𝔱𝔦𝔬𝔫' + nameSuffix + ' \uD83D\uDDDE\uFE0F'
  let prevLabel = ''

  for (const [index, editionStatus] of editionStatuses.entries()) {
    const curLabel = editionLabel(editionStatus, true)
    const sectionName = editionName + ' ' + curLabel
    const acctName = 'DailyEdition' + nameSuffix + curLabel.replace(/\W/g, '')

    const insertId = createSnowflakeId(displayTime, editionStatuses.length - index - 1)
    const rebloggedStatus = curatorReblog(editionStatus, insertId, acctName, sectionName)

    rebloggedStatus.curation_edition_status = 1
    if (index === 0) {
      rebloggedStatus.curation_edition_firststatus = 1
    } else if (curLabel.toLowerCase() !== prevLabel) {
      rebloggedStatus.curation_section_firststatus = 1
    }

    if (index === editionStatuses.length - 1) {
      rebloggedStatus.curation_edition_laststatus = 1
    }

    rebloggedStatuses.push(rebloggedStatus)
    console.log('reblogEditionStatuses EDITION ENTRY', index, editionLabel(editionStatus), editionStatus, rebloggedStatus)
    prevLabel = curLabel.toLowerCase()
  }
  return rebloggedStatuses
}

let PrevStatusId = 0
let MaxStatusId = ''

export async function insertEditionStatuses (statuses, updating) {
  const editionTimeStrs = getEditionTimeStrs()
  const editionCount = editionTimeStrs.length

  console.log('insertEditionStatuses:', statuses.length, updating, editionTimeStrs)

  const result = []

  for (const status of statuses) {
    for (const [j, editionTimeStr] of editionTimeStrs.entries()) {
      const editionTime = hhmm2localTime(editionTimeStr)
      const editionId = createSnowflakeId(editionTime)
      if (!editionId) {
        continue
      }

      let aboveEditionId = null

      if (updating) {
        if (MaxStatusId && (MaxStatusId < editionId) && (status.id >= editionId)) {
          aboveEditionId = status.id
        }
      } else {
        if (PrevStatusId && (status.id < editionId) && (PrevStatusId >= editionId)) {
          aboveEditionId = PrevStatusId
        }
      }
      if (!aboveEditionId) {
        continue
      }
      // Edition boundary crossed
      const prevEditionTimeStr = editionTimeStrs[(j + editionCount - 1) % editionCount]
      const nameSuffix = (editionCount > 1 ? ' ' + (j + 1) : '')
      const rebloggedStatuses = await reblogEditionStatuses(nameSuffix, editionTimeStr, prevEditionTimeStr, aboveEditionId)

      if (!rebloggedStatuses) {
        // Empty edition or rare overlap between edition reblog Ids and Id of the status to be displayed above the edition
        status.curation_edition_empty = 1
        continue
      }

      result.push(...rebloggedStatuses)
    }
    result.push(status)
    PrevStatusId = status.id
    MaxStatusId = MaxStatusId && (MaxStatusId >= status.id) ? MaxStatusId : status.id
  }
  return result
}

const BoostedStatusIds = {}

const BUFFER_FAC = 3
const BUFFER_EXCESS = 100

function boostStatusId (statusId) {
  // Track boosted status ids in timeline
  // Return true if new boost and false if already boosted
  if (statusId in BoostedStatusIds) {
    return false
  }

  const keys = Object.keys(BoostedStatusIds)

  const deleteCount = keys.length - (BUFFER_FAC * 2 + BUFFER_EXCESS)

  if (deleteCount >= 1) {
    console.log('boostStatusId:', keys.length, deleteCount)
    keys.sort()
    const deleteKeys = keys.slice(0, deleteCount + BUFFER_EXCESS)
    for (const key of deleteKeys) {
      delete BoostedStatusIds[key]
    }
  }
  BoostedStatusIds[statusId] = 1
  return true
}

export function curateStatuses (instanceName, statuses, updating) {
  const { curationShowAllStatus, curationHideDuplicateBoosts, curationLastSaveInterval } = store.get()
  console.log('curateStatuses', instanceName, updating, statuses.length)

  const editionCount = getEditionTimeStrs().length
  const currentFollows = getCurrentFollows()
  const currentFilter = getFilter()
  const [currentStats, currentProbs] = currentFilter || [null, null]

  const nextIntervalId = curationLastSaveInterval ? createSnowflakeId(nextInterval(curationLastSaveInterval)) : 0
  let prevIntervalComplete = false

  const result = []
  for (const status of statuses) {
    MaxStatusId = MaxStatusId && (MaxStatusId >= status.id) ? MaxStatusId : status.id
    if (nextIntervalId && (status.id >= nextIntervalId)) {
      prevIntervalComplete = true
    }
    if (status.curation_edition) {
      result.push(status)
    } else if (!status.curation_id) {
      const statusSummary = summarizeStatus(status)
      const modStatus = curateSingleStatus(statusSummary, instanceName, currentFollows, currentStats, currentProbs, editionCount)

      if (modStatus.curation_save) {
        putEditionStatus({ ...status, ...{ curation_save: modStatus.curation_save, curation_tag: modStatus.curation_tag || '' } })
      }

      if (curationHideDuplicateBoosts && status.reblog) {
        if (!modStatus.curation_dropped && !boostStatusId(status.reblog.id)) {
          // Drop duplicate boosts from this timeline (different boosts could be dropped for different timeline views)
          modStatus.curation_dropped = 'duplicate boost'
        }
      }

      Object.assign(status, modStatus)
      if (!status.curation_dropped || curationShowAllStatus) {
        result.push(status)
      }

      if (PREFILL_STATUSBUFFER) {
        // May happen asynchronously; no need to wait
        bufferStatusSummaryAsync(currentFollows, statusSummary)
      }
    }
  }

  if (prevIntervalComplete) {
    // Asynchronous
    updateStatusBuffer('timeline')
  }

  console.log('curateStatuses-DONE', result.length)
  return result
}

export async function addReplyContexts (instanceName, accessToken, statuses) {
  const { curationDevFetchStatus } = store.get()
  const result = []

  for (const status of statuses) {
    result.push(status)
    const origStatus = status.reblog || status
    if (!status.curation_dropped && origStatus.in_reply_to_id && origStatus.in_reply_to_account_id !== origStatus.account.id) {
      // Reply post (but not self reply): display context (i.e., original post) below
      let replyContextStatus = await database.getStatus(instanceName, origStatus.in_reply_to_id)

      if (!replyContextStatus && curationDevFetchStatus) {
        console.log('addReplyContexts: retrieving original status from server')
        replyContextStatus = await getStatus(instanceName, accessToken, origStatus.in_reply_to_id)
        if (replyContextStatus && !replyContextStatus.in_reply_to_id) {
          database.insertStatus(instanceName, replyContextStatus)
        }
      }

      if (replyContextStatus && !replyContextStatus.in_reply_to_id) {
        // Original post found and is not a reply
        const contextId = createSnowflakeId(getSnowflakeEpoch(status.id) - 1)
        const oldStatus = await database.getStatus(instanceName, contextId)

        if (!oldStatus || (oldStatus.curation_edition && oldStatus.reblog && oldStatus.reblog.id === replyContextStatus.id)) {
          // context Id does not collide with old status in cache (checking for rare occurrence)
          const contextStatus = curatorReblog(replyContextStatus, contextId, 'ReplyContext', 'Reply Context')
          status.curation_reply = 1
          contextStatus.curation_reply = 1
          contextStatus.curation_context = 1
          result.push(contextStatus)
          console.log('addReplyContexts REPLY CONTEXT', status.curation_dropped, status, contextStatus)
        }
      }
    }
  }
  return result
}
