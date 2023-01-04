import { store } from '../_store/store.js'

import { getItem, putItem, keyRange, keyBefore, objectStoreNames, clearStore, getAllKeys, deleteAllItems, hhmm2localTime, date2hhmmISO, convertDate2Timezone, equalForTimezone } from './curationStore.js'

import { CACHE_PREFIX, getCurrentFollows, getUserFollow, setUserFollow, getFilter, getAllCachedKeys, clearAllCached, getCached, getAllEditionStatuses } from './curationCache.js'

import { nextInterval, getHashtags, getDigestUsers } from './curationGeneral.js'
import { computePostStats } from './curationStats.js'
import { updateStatusBuffer, CurationCounter } from './curationBuffer.js'

import { refreshCurationFollows } from './curationFollows.js'

import { eraseRecentCurationData, eraseAllCurationData } from './curationData.js'

import { createSnowflakeId, getSnowflakeDate } from './curationSnowflakeId.js'

import { HmacHex } from '../_thirdparty/HMAC/HMAC.js'

import { testHasLocalStorage } from '../_utils/testStorage.js'

if (!testHasLocalStorage()) {
  window.alert('curationTest.js: No local storage on browser!')
}

window.eraseRecentCurationData = eraseRecentCurationData

window.eraseAllCurationData = eraseAllCurationData

window.CurationCounter = CurationCounter

window.getDigestUsers = getDigestUsers

window.getHashtags = getHashtags

window.convertDate2Timezone = convertDate2Timezone

window.equalForTimezone = equalForTimezone

window.ampFactor = function (username) {
  const value = getUserFollow(username)
  if (value) {
    const result = window.prompt('Amp factor for ' + username + ':', 1)
    if (result) {
      const ampfac = parseInt(result)
      if (ampfac) {
        value.amp_factor = ampfac
        setUserFollow(username, value)
      }
    }
  }
}

window.hhmm2localTime = function (HHcMM, past) {
  return hhmm2localTime(HHcMM, past)
}

window.myRefreshCurationFollows = function () {
  refreshCurationFollows(true).then(console.log('myRefreshCurationFollows', getCurrentFollows()))
}

window.updateStatusBuffer = function (callType) {
  const { currentInstance, verifyCredentials } = store.get()

  if (!verifyCredentials[currentInstance]) {
    console.log('window.updateStatusBuffer NO CREDENTIALS')
    return
  }
  updateStatusBuffer(callType).then(() => console.log('curated'))
}

window.myComputePostStats = function () {
  computePostStats().then(result => console.log('myComputePostStats', result))
}

// FOR TESTING

window.getAllEditionStatuses = function () {
  return getAllEditionStatuses(0, createSnowflakeId(Date.now())).then((x) => console.log('getAllEditionStatuses: statuses', x.map(y => y.account.acct + (y.curation_save || '')), x))
}

window.getRecentEditionStatuses = function (startTimeHHMM, endTimeHHMM) {
  startTimeHHMM = startTimeHHMM || new Date().toLocaleString('en-GB', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).slice(-8, -3)
  endTimeHHMM = endTimeHHMM || startTimeHHMM
  const endTime = hhmm2localTime(endTimeHHMM)
  const endId = createSnowflakeId(endTime)
  const startTime = hhmm2localTime(startTimeHHMM, endTime.getTime())
  const startId = createSnowflakeId(startTime)
  console.log('getRecentEditionStatuses', startTimeHHMM, endTimeHHMM, startTime, endTime)

  return getAllEditionStatuses(startId, endId).then((x) => console.log('getAllEditionStatuses: statuses', x.map(y => y.account.acct + (y.curation_save || '')), x))
}

window.getAllCachedKeys = function (prefix) {
  return getAllCachedKeys(prefix)
}

window.clearAllCached = function (prefix) {
  clearAllCached(prefix)
}

window.getCached = function (prefix, id) {
  return getCached(prefix, id)
}

window.showAllCached = function (prefix) {
  const keys = []
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(CACHE_PREFIX + prefix)) {
      keys.push(key)
    }
  }
  keys.sort()
  for (const key of keys) {
    console.log('showAllCached:', key, localStorage[key])
  }
}

window.testNextInterval = function (lastInterval) {
  return nextInterval(lastInterval)
}

window.getFilter = function () {
  return getFilter()
}

// TEST code
const TEST_INSTANCE = 'fediscience.org'

window.curationStoreNames = function (callback) {
  objectStoreNames(TEST_INSTANCE).then((response) => callback(response))
}

window.clearCurationStore = function (storeName) {
  clearStore(TEST_INSTANCE, storeName).then((response) => { console.log('Cleared ' + storeName) })
}

function ids2dates (ids) {
  if (!ids) return []
  ids.sort()
  return ids.map(id => date2hhmmISO(getSnowflakeDate(id)))
}

window.createSnowflakeId = createSnowflakeId

window.getCurationAllKeys = function (storeName, callback, minId, maxIdPlus) {
  if (minId && maxIdPlus) {
    getAllKeys(TEST_INSTANCE, storeName, keyRange(minId, maxIdPlus, false, true)).then((response) => callback(ids2dates(response)))
  } else if (!minId && maxIdPlus) {
    getAllKeys(TEST_INSTANCE, storeName, keyBefore(maxIdPlus, true)).then((response) => callback(ids2dates(response)))
  } else {
    getAllKeys(TEST_INSTANCE, storeName).then((response) => callback(ids2dates(response)))
  }
}

window.removeCurationAllItems = function (storeName, callback, minId, maxIdPlus) {
  deleteAllItems(TEST_INSTANCE, storeName, IDBKeyRange.bound(minId, maxIdPlus, false, true)).then((response) => callback(response))
}

window.getCurationItem = function (storeName, id) {
  getItem(TEST_INSTANCE, storeName, id).then(response => console.log('getCurationItem', id, response ? Object.keys(response) : [], response))
}

window.putCurationItem = function (storeName, item) {
  putItem(TEST_INSTANCE, storeName, item).then(response => response)
}

// Useful to compare
async function hmacSha256Hex (secret, message) {
  // https://medium.com/gft-engineering/mac-and-hmac-simply-explained-with-javascript-snippets-555e2bf82de8
  const enc = new TextEncoder('utf-8')
  const algorithm = { name: 'HMAC', hash: 'SHA-256' }

  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    algorithm,
    false, ['sign', 'verify']
  )
  const hashBuffer = await window.crypto.subtle.sign(
    algorithm.name,
    key,
    enc.encode(message)
  )
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(
    b => b.toString(16).padStart(2, '0')
  ).join('')
  return hashHex
}

window.compareHMAC = function (key, data) {
  hmacSha256Hex(key, data).then(x => console.log(x, HmacHex(key, data)))
}
