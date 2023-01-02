import { dbPromise, getDatabase } from './databaseLifecycle.js'
import {
  ACCOUNTS_STORE,
  NOTIFICATION_TIMELINES_STORE,
  NOTIFICATIONS_STORE,
  PINNED_STATUSES_STORE,
  RELATIONSHIPS_STORE,
  STATUS_TIMELINES_STORE,
  STATUSES_STORE,
  THREADS_STORE,
  TIMESTAMP
  , CURATION_STATUSBUFFER_STORE,
  CURATION_STATUSEDITION_STORE
} from './constants.js'

import { debounce } from '../_thirdparty/lodash/timers.js'
import { mark, stop } from '../_utils/marks.js'
import { deleteAll } from './utils.js'
import { createPinnedStatusKeyRange, createThreadKeyRange } from './keys.js'
import { getKnownInstances } from './knownInstances.js'
import { noop } from '../_utils/lodash-lite.js'
import {
  CLEANUP_DELAY,
  CLEANUP_TIME_AGO,
  CURATION_DELAY,
  CURATION_STATUSBUFFER_AGO,
  CURATION_STATUSEDITION_AGO
} from '../_static/database.js'
import { scheduleIdleTask } from '../_utils/scheduleIdleTask.js'

import { createSnowflakeId, getSnowflakeDate } from '../_curation/curationSnowflakeId.js'

const BATCH_SIZE = 20

function batchedGetAll (callGetAll, callback) {
  function nextBatch () {
    callGetAll().onsuccess = function (e) {
      const results = e.target.result
      callback(results)
      if (results.length) {
        nextBatch()
      }
    }
  }
  nextBatch()
}

function cleanupStatuses (statusesStore, statusTimelinesStore, threadsStore, cutoff) {
  batchedGetAll(
    () => statusesStore.index(TIMESTAMP).getAllKeys(IDBKeyRange.upperBound(cutoff), BATCH_SIZE),
    results => {
      results.forEach(statusId => {
        statusesStore.delete(statusId)
        deleteAll(
          statusTimelinesStore,
          statusTimelinesStore.index('statusId'),
          IDBKeyRange.only(statusId)
        )
        deleteAll(
          threadsStore,
          threadsStore,
          createThreadKeyRange(statusId)
        )
      })
    }
  )
}

function cleanupNotifications (notificationsStore, notificationTimelinesStore, cutoff) {
  batchedGetAll(
    () => notificationsStore.index(TIMESTAMP).getAllKeys(IDBKeyRange.upperBound(cutoff), BATCH_SIZE),
    results => {
      results.forEach(notificationId => {
        notificationsStore.delete(notificationId)
        deleteAll(
          notificationTimelinesStore,
          notificationTimelinesStore.index('notificationId'),
          IDBKeyRange.only(notificationId)
        )
      })
    }
  )
}

function cleanupAccounts (accountsStore, pinnedStatusesStore, cutoff) {
  batchedGetAll(
    () => accountsStore.index(TIMESTAMP).getAllKeys(IDBKeyRange.upperBound(cutoff), BATCH_SIZE),
    results => {
      results.forEach(accountId => {
        accountsStore.delete(accountId)
        deleteAll(
          pinnedStatusesStore,
          pinnedStatusesStore,
          createPinnedStatusKeyRange(accountId)
        )
      })
    }
  )
}

function cleanupRelationships (relationshipsStore, cutoff) {
  batchedGetAll(
    () => relationshipsStore.index(TIMESTAMP).getAllKeys(IDBKeyRange.upperBound(cutoff), BATCH_SIZE),
    results => {
      results.forEach(relationshipId => {
        relationshipsStore.delete(relationshipId)
      })
    }
  )
}

export async function cleanup (instanceName) {
  console.log('cleanup', instanceName)
  mark(`cleanup:${instanceName}`)
  const db = await getDatabase(instanceName)
  const storeNames = [
    STATUSES_STORE,
    STATUS_TIMELINES_STORE,
    NOTIFICATIONS_STORE,
    NOTIFICATION_TIMELINES_STORE,
    ACCOUNTS_STORE,
    RELATIONSHIPS_STORE,
    THREADS_STORE,
    PINNED_STATUSES_STORE
  ]
  await dbPromise(db, storeNames, 'readwrite', (stores) => {
    const [
      statusesStore,
      statusTimelinesStore,
      notificationsStore,
      notificationTimelinesStore,
      accountsStore,
      relationshipsStore,
      threadsStore,
      pinnedStatusesStore
    ] = stores

    const cutoff = Date.now() - CLEANUP_TIME_AGO

    cleanupStatuses(statusesStore, statusTimelinesStore, threadsStore, cutoff)
    cleanupNotifications(notificationsStore, notificationTimelinesStore, cutoff)
    cleanupAccounts(accountsStore, pinnedStatusesStore, cutoff)
    cleanupRelationships(relationshipsStore, cutoff)
  })
  stop(`cleanup:${instanceName}`)
}

async function cleanupCurationStatuses (curationStatusStore, cutoffTime) {
  console.log('****cleanupCurationStatuses', curationStatusStore, new Date(cutoffTime))
  batchedGetAll(
    () => curationStatusStore.getAllKeys(IDBKeyRange.upperBound(createSnowflakeId(cutoffTime), true), BATCH_SIZE),
    results => {
      results.forEach(statusId => {
        console.log('****cleanupCurationStatuses NO_DELETE_YET', getSnowflakeDate(statusId).toISOString())
        /// curationStatusStore.delete(statusId)
      })
    }
  )
}

export async function curationCleanup (instanceName) {
  console.log('curationCleanup', instanceName)
  mark(`curationCleanup:${instanceName}`)
  const db = await getDatabase(instanceName)
  const storeNames = [
    CURATION_STATUSBUFFER_STORE,
    CURATION_STATUSEDITION_STORE
  ]
  await dbPromise(db, storeNames, 'readwrite', (stores) => {
    const [
      curationStatusBufferStore,
      curationStatusEditionStore
    ] = stores

    cleanupCurationStatuses(curationStatusBufferStore, Date.now() - CURATION_STATUSBUFFER_AGO)
    cleanupCurationStatuses(curationStatusEditionStore, Date.now() - CURATION_STATUSEDITION_AGO)
  })
  stop(`curationCleanup:${instanceName}`)
}

function doCleanup (instanceName) {
  scheduleIdleTask(() => cleanup(instanceName))
}

function doCurationCleanup (instanceName) {
  scheduleIdleTask(() => curationCleanup(instanceName))
}

async function scheduledCleanup () {
  console.log('scheduledCleanup')
  const knownInstances = await getKnownInstances()
  for (const instance of knownInstances) {
    doCleanup(instance)
  }
}

async function scheduledCurationCleanup () {
  console.log('scheduledCurationCleanup')
  const knownInstances = await getKnownInstances()
  for (const instance of knownInstances) {
    doCurationCleanup(instance)
  }
}

// we have unit tests that test indexedDB; we don't want this thing to run forever
export const scheduleCleanup = process.browser ? debounce(scheduledCleanup, CLEANUP_DELAY) : noop

// Curation database cleanup
export const scheduleCurationCleanup = process.browser ? debounce(scheduledCurationCleanup, CURATION_DELAY) : noop
