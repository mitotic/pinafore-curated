import { store } from '../_store/store.js'
import { database } from '../_database/database.js'
import { getStatus } from '../_api/statuses.js'

import { createSnowflakeId, getSnowflakeEpoch, getSnowflakeDate } from './curationSnowflakeId.js'
import { hhmm2localTime, date2hhmmISO } from './curationStore.js'
import { curatorReblog } from './curationUser.js'
import { updateStatusBuffer } from './curationBuffer.js'

import { PREFILL_STATUSBUFFER, getCurrentFollows, getFilter, putEditionStatus, getAllEditionStatuses } from './curationCache.js'

import { nextInterval, getEditionTimeStrs, summarizeStatus, bufferStatusSummaryAsync } from './curationGeneral.js'

import { curateSingleStatus } from './curationFilter.js'

const { curationShowAllStatus } = store.get()

const EDITION_TAGS = ['#motd', '#motw', '#motm', '#']

function editionLabel (status, section) {
  const tag = (status.curation_save || '#').toLowerCase()
  const j = EDITION_TAGS.indexOf(tag)
  let label
  if (j >= 0) {
    label = (j < 10 ? '0' + j : j) + tag
  } else {
    // In ASCII sort order, '@' comes after all digits
    label = '@@' + tag
  }
  return section ? label.substr(3) : label + '@' + status.account.acct + '-' + date2hhmmISO(getSnowflakeDate(status.id))
}

let PrevStatusId = 0
let MaxStatusId = 0

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
        if (MaxStatusId && (MaxStatusId < editionId) && (status.id > editionId)) {
          aboveEditionId = status.id
        }
      } else {
        if (PrevStatusId && (status.id < editionId) && (PrevStatusId > editionId)) {
          aboveEditionId = PrevStatusId
        }
      }
      if (!aboveEditionId) {
        continue
      }
      // Edition boundary crossed
      // (Inequality check helps in creating "unique" edition reblog ids, but will fail in the rare case that status.id === editionId)
      const startTimeStr = editionTimeStrs[(j + editionCount - 1) % editionCount]  // Prev edition time
      const startTime = hhmm2localTime(startTimeStr, editionTime.getTime())
      const startId = createSnowflakeId(startTime)

      const editionStatuses = await getAllEditionStatuses(startId, editionId)
      const editionIdMax = createSnowflakeId(editionTime, editionStatuses.length)

      if (!editionStatuses.length || aboveEditionId <= editionIdMax) {
        // Empty edition or rare overlap between edition reblog Ids and Id of the status to be displayed above the edition
        status.demarcate_top_heavy = 1
        continue
      }

      const editionName = '𝔇𝔞𝔦𝔩𝔶 𝔈𝔡𝔦𝔱𝔦𝔬𝔫' + (editionCount > 1 ? ' ' + (j + 1) : '') + ' \uD83D\uDDDE\uFE0F'

      editionStatuses.sort((a, b) => (editionLabel(a) > editionLabel(b)) ? 1 : -1)

      console.log('insertEditionStatuses NEW-EDITION', editionName, editionStatuses.length, editionTime)

      let prevLabel = ''
      for (const [index, editionStatus] of editionStatuses.entries()) {
        const curLabel = editionLabel(editionStatus, true)
        const sectionName = editionName + (curLabel ? ' #' + curLabel : '')
        const acctName = 'DailyEdition' + (editionCount > 1 ? '' + (j + 1) : '') + curLabel.replace(/\W/g, '')

        const insertId = createSnowflakeId(editionTime, editionStatuses.length - index - 1)
        const rebloggedStatus = curatorReblog(editionStatus, insertId, acctName, sectionName)

        rebloggedStatus.demarcate_side = 1
        if (index === 0) {
          rebloggedStatus.demarcate_top = 1
        } else if (curLabel !== prevLabel) {
          rebloggedStatus.demarcate_top_lite = 1
        }

        if (index === editionStatuses.length - 1) {
          rebloggedStatus.demarcate_bottom = 1
        }

        result.push(rebloggedStatus)
        console.log('insertEditionStatuses EDITION ENTRY', index, editionLabel(editionStatus), editionStatus, rebloggedStatus)
        prevLabel = curLabel
      }
    }
    result.push(status)
    PrevStatusId = status.id
    MaxStatusId = Math.max(status.id, MaxStatusId)
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
  const { curationHideDuplicateBoosts, curationLastSaveInterval } = store.get()
  console.log('curateStatuses', instanceName, updating, statuses.length)

  const editionCount = getEditionTimeStrs().length
  const currentFollows = getCurrentFollows()
  const currentFilter = getFilter()
  const [currentStats, currentProbs] = currentFilter || [null, null]

  const nextIntervalId = curationLastSaveInterval ? createSnowflakeId(nextInterval(curationLastSaveInterval)) : 0
  let prevIntervalComplete = false

  const result = []
  for (const status of statuses) {
    MaxStatusId = Math.max(status.id, MaxStatusId)
    if (nextIntervalId && (status.id >= nextIntervalId)) {
      prevIntervalComplete = true
    }
    if (status.curation_edition) {
      result.push(status)
    } else if (!status.curation_id) {
      const statusSummary = summarizeStatus(status)
      const modStatus = curateSingleStatus(statusSummary, instanceName, currentFollows, currentStats, currentProbs, editionCount)

      if (modStatus.curation_save) {
        putEditionStatus({ ...status, ...{ curation_save: modStatus.curation_save } })
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
        bufferStatusSummaryAsync(currentFollows, {}, statusSummary)
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
