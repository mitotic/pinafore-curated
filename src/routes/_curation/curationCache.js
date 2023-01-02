import { store } from '../_store/store.js'

import { getItem, putItem, putRawItem, keyRange, keyBefore, getAllItems, deleteAllItems, getAllKeys } from '../_curation/curationStore.js'

import { createSnowflakeId } from '../_curation/curationSnowflakeId.js'

import { CURATION_STATUSBUFFER_STORE, CURATION_STATUSEDITION_STORE } from '../_database/constants.js'

const { currentInstance } = store.get()

// Caches in localStorage

export const PREFILL_STATUSBUFFER = true

export const CACHE_PREFIX = 'curation_'

const PARAM_PREFIX = 'param_'
const FILTER_PREFIX = 'filter_'

// Take object of objects of the form {id1: {prop1:val1, prop2, val2, ...}, id2: ...}
// where protoObj = {prop1: defval1, prop2:defval2, ...}
// and create stringifed array [ [params, [prop1, prop2, ...],
//                               [id1, [val1, val2, ...]],
//                               ...
//                             ]
// Note: Extra properties are ignored

function stringifyObjArray (protoObj, params, objArray) {
  const keys = Object.keys(protoObj)
  keys.sort()
  const arr = [[params || null, keys]]
  const ids = Object.keys(objArray)
  ids.sort()
  for (const id of ids) {
    const obj = objArray[id]
    const elem = []
    for (const key of keys) {
      if (key in obj) {
        elem.push(obj[key])
      } else {
        elem.push(protoObj[key])
      }
    }
    arr.push([id, elem])
  }
  return JSON.stringify(arr)
}

// Reconstruct stringified object array
function parseObjArray (arrayStr) {
  const arr = JSON.parse(arrayStr)
  const [params, keys] = arr[0]
  const objArray = []
  for (const [id, elem] of arr.slice(1)) {
    const obj = {}
    for (const [j, key] of keys.entries()) {
      obj[key] = elem[j]
    }
    objArray[id] = obj
  }
  return [params, objArray]
}

// Clone object using prototype object, skipping default values
export function cloneObj (protoObj, obj) {
  const result = {}
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if ((key in protoObj) && (value === protoObj[key])) {
      continue
    }
    result[key] = value
  }
  return result
}

// Add properties to obj with default value, as needed
export function uncloneObj (protoObj, obj) {
  for (const key of Object.keys(protoObj)) {
    if (!(key in obj)) {
      obj[key] = protoObj[key]
    }
  }
}

const SessionCache = {}

export function setCached (prefix, id, value) {
  const idStr = CACHE_PREFIX + prefix + id
  const strVal = JSON.stringify(value)
  localStorage.setItem(idStr, strVal)
  SessionCache[idStr] = strVal
}

export function getCached (prefix, id) {
  // Return value or null
  const idStr = CACHE_PREFIX + prefix + id
  if (idStr in SessionCache) {
    return JSON.parse(SessionCache[idStr])
  }
  const strVal = localStorage.getItem(idStr)
  if (strVal) {
    SessionCache[idStr] = strVal
    return JSON.parse(strVal)
  }
  return null
}

export function removeCached (prefix, id) {
  // Remove item from cache and local storage and return it
  const value = getCached(prefix, id)
  const idStr = CACHE_PREFIX + prefix + id

  localStorage.removeItem(idStr)
  if (idStr in SessionCache) {
    delete SessionCache[idStr]
  }
  return value
}

export function getAllCachedKeys (prefix) {
  const fullPrefix = CACHE_PREFIX + (prefix || '')
  const keys = []
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(fullPrefix)) {
      keys.push(key.substring(fullPrefix.length))
    }
  }
  return keys
}

export function clearAllCached (prefix) {
  const fullPrefix = CACHE_PREFIX + (prefix || '')
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(fullPrefix)) {
      localStorage.removeItem(key)
    }
  }

  for (const key of Object.keys(SessionCache)) {
    if (key.startsWith(fullPrefix)) {
      delete SessionCache[key]
    }
  }
}

export function putEditionStatus (status) {
  putRawItem(currentInstance, CURATION_STATUSEDITION_STORE, status)
}

export async function getAllEditionStatuses (startId, endIdMinus) {
  let statuses = []
  try {
    statuses = await getAllItems(currentInstance, CURATION_STATUSEDITION_STORE, keyRange(startId, endIdMinus))
  } catch (err) {
    console.log('getAllEditionStatuses: ERROR', err.message)
  }
  return statuses
}

export function deleteAllEditionStatuses (endIdMinus) {
  return deleteAllItems(currentInstance, CURATION_STATUSEDITION_STORE, keyBefore(endIdMinus, true))
}

// Parameters: name: value
export function getParam (name) {
  return getCached(PARAM_PREFIX, name)
}

export function setParam (name, value) {
  return setCached(PARAM_PREFIX, name, value)
}

const STATUS_SUMMARY_PROTO = {
  id: '',
  username: '',
  orig_username: '',
  reblog_id: '',
  reblogs_count: 0,
  mentions: [],
  in_reply_to_id: '',
  self_reply: 0,
  tags: [],
  bookmarked: 0,
  favourited: 0,
  reblogged: 0
}

export function idRangeForInterval (startIntervalStr, endIntervalStr) {
  return keyRange(createSnowflakeId(startIntervalStr), createSnowflakeId(endIntervalStr), false, true)
}

export function idRangeBefore (beforeTimeStr) {
  return keyBefore(createSnowflakeId(beforeTimeStr), true)
}

export async function getStatusKey (statusId) {
  return await getAllKeys(currentInstance, CURATION_STATUSBUFFER_STORE, keyRange(statusId, statusId))
}

export async function getStatus (statusId) {
  const status = await getItem(currentInstance, CURATION_STATUSBUFFER_STORE, statusId)
  return status
}

export async function getStatuses (startIntervalStr, endIntervalStr, raw) {
  let statuses = await getAllItems(currentInstance, CURATION_STATUSBUFFER_STORE, idRangeForInterval(startIntervalStr, endIntervalStr))

  if (raw) {
    statuses = statuses.map(obj => { delete obj.__pinafore_ts; return obj })
  } else {
    statuses = statuses.map(obj => { uncloneObj(STATUS_SUMMARY_PROTO, obj); return obj })
  }
  return statuses
}

export async function getAllStatusKeysBefore (beforeTimeStr) {
  return await getAllKeys(currentInstance, CURATION_STATUSBUFFER_STORE, idRangeBefore(beforeTimeStr))
}

export async function getAllStatusKeysRange (startIntervalStr, endIntervalStr) {
  return await getAllKeys(currentInstance, CURATION_STATUSBUFFER_STORE, idRangeForInterval(startIntervalStr, endIntervalStr))
}

export function removeStatuses (beforeTimeStr) {
  deleteAllItems(currentInstance, CURATION_STATUSBUFFER_STORE, idRangeBefore(beforeTimeStr))
}

export async function setStatus (id, status) {
  await putItem(currentInstance, CURATION_STATUSBUFFER_STORE, status)
}

// Filter {'old': [param, {key1: ..., key2: ...}], 'new': null}

export function getObjArray (prefix, key) {
  const idStr = CACHE_PREFIX + prefix + key
  if (!SessionCache[idStr]) {
    const strVal = localStorage.getItem(idStr)
    if (!strVal) return null
    SessionCache[idStr] = parseObjArray(strVal)
  }
  return SessionCache[idStr]
}

export function setObjArray (prefix, key, value, protoObj) { // value = [param, {key1: ..., key2: ...}]
  const idStr = CACHE_PREFIX + prefix + key
  SessionCache[idStr] = value
  const strVal = stringifyObjArray(protoObj, value[0], value[1])
  localStorage.setItem(idStr, strVal)
}

export const TIMELINE_FILTER_PROTO = {
  altname: '',
  acct_id: '',
  topics: '',
  motx_daily: 0,
  priority_daily: 0,
  post_daily: 0,
  boost_daily: 0,
  reblog2_daily: 0,
  engaged_daily: 0,
  total_daily: 0,
  net_prob: 0,
  priority_prob: 0,
  post_prob: 0,
  reblog2_avg: 0
}

export function newUserFilter (obj) {
  return { ...TIMELINE_FILTER_PROTO, ...obj }
}

export function getFilter () {
  return getObjArray(FILTER_PREFIX, '')
}

export function setFilter (value) {
  return setObjArray(FILTER_PREFIX, '', value, TIMELINE_FILTER_PROTO)
}

const USER_FOLLOW_PREFIX = 'userfollow_'

const USER_FOLLOW_PROTO = {
  username: '',
  acct_id: '',
  acct: '',
  avatar: '',
  display_name: '',
  followed_at: '',
  view_level: '',
  amp_factor: 1,
  auto_curate: 0,
  mahoot: '',
  topics: '',
  tz: '',
  motd: '',
  motw: '',
  motm: ''
}

// View level: 'all', '' or 'auto' (DEFAULT), 'daily', 'weekly', 'monthly', 'none' (MUTE)
// auto_curate: if true, curate all motx posts (unless #NOCURATE hashtag is present) (NOT USED YET)

export const USER_FOLLOW_UPDATE = ['avatar', 'display_name']

export function newUserFollow (obj) {
  return { ...USER_FOLLOW_PROTO, ...(obj || {}) }
}

export function getUserFollow (username) {
  return getCached(USER_FOLLOW_PREFIX, username)
}

export function removeUserFollow (username) {
  return removeCached(USER_FOLLOW_PREFIX, username)
}

export function setUserFollow (username, value) {
  return setCached(USER_FOLLOW_PREFIX, username, value)
}

export function getCurrentFollows () {
  const usernames = getAllCachedKeys(USER_FOLLOW_PREFIX)
  const currentFollows = {}
  for (const username of usernames) {
    currentFollows[username] = getUserFollow(username)
  }
  return currentFollows
}
