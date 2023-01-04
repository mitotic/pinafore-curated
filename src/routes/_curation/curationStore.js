import { cloneForStorage } from '../_database/helpers.js'
import { difference } from '../_thirdparty/lodash/objects.js'

import { dbPromise, getDatabase } from '../_database/databaseLifecycle.js'

export const MOTD_TAG = 'motd'
export const MOTW_TAG = 'motw'
export const MOTM_TAG = 'motm'
export const MOTX_TAG = 'motx'

export const MOT_TAGS = [MOTD_TAG, MOTW_TAG, MOTM_TAG]

export const PRIORITY_TAG = 'priority'

export const DIGEST_TAG = 'digest'
export const NODIGEST_TAG = 'nodigest'

export function keyRange (minId, maxId, excludeMin, excludeMax) {
  return IDBKeyRange.bound(minId, maxId, excludeMin, excludeMax)
}

export function keyBefore (maxId, excludeMax) {
  return IDBKeyRange.upperBound(maxId, excludeMax)
}

export function keyAfter (minId, excludeMin) {
  return IDBKeyRange.lowerBound(minId, excludeMin)
}

export async function putItem (instanceName, storeName, item) {
  const db = await getDatabase(instanceName)
  await dbPromise(db, storeName, 'readwrite', (storeObj, callback) => {
    storeObj.put(cloneForStorage(item))
  })
}

export async function putRawItem (instanceName, storeName, item) {
  const db = await getDatabase(instanceName)
  await dbPromise(db, storeName, 'readwrite', (storeObj, callback) => {
    storeObj.put(item)
  })
}

export async function getItem (instanceName, storeName, id) {
  const db = await getDatabase(instanceName)
  const result = await dbPromise(db, storeName, 'readonly', (storeObj, callback) => {
    fetchItem(storeObj, id, callback)
  })
  return result
}

export async function getAllItems (instanceName, storeName, idRange) {
  const db = await getDatabase(instanceName)
  const result = await dbPromise(db, storeName, 'readonly', (storeObj, callback) => {
    fetchAllItems(storeObj, idRange, callback)
  })
  return result
}

export async function deleteAllItems (instanceName, storeName, idRangeOrId) {
  const db = await getDatabase(instanceName)
  const result = await dbPromise(db, storeName, 'readwrite', (storeObj, callback) => {
    deleteItems(storeObj, idRangeOrId, callback)
  })
  return result
}

export function fetchItem (storeObj, id, callback) {
  storeObj.get(id).onsuccess = e => {
    callback(e.target.result)
  }
}

export function fetchAllItems (storeObj, idRange, callback) {
  storeObj.getAll(idRange).onsuccess = e => {
    callback(e.target.result)
  }
}

export function deleteItems (storeObj, idRangeOrId, callback) {
  storeObj.delete(idRangeOrId).onsuccess = e => {
    callback(e.target.result)
  }
}

export async function clearStore (instanceName, storeName) {
  const db = await getDatabase(instanceName)
  await dbPromise(db, storeName, 'readwrite', (storeObj, callback) => {
    storeObj.clear()
  })
}

export async function objectStoreNames (instanceName) {
  const db = await getDatabase(instanceName)
  return db.objectStoreNames
}

export async function getAllKeys (instanceName, storeName, idRange) {
  const db = await getDatabase(instanceName)
  const result = await dbPromise(db, storeName, 'readonly', (storeObj, callback) => {
    storeObj.getAllKeys(idRange).onsuccess = e => {
      callback(e.target.result)
    }
  })
  return result
}

export async function deleteOldKeys (instanceName, storeName, newKeys) {
  const db = await getDatabase(instanceName)
  await dbPromise(db, storeName, 'readwrite', (storeObj, callback) => {
    storeObj.getAllKeys().onsuccess = e => {
      const existingKeys = e.target.result
      const keysToDelete = difference(existingKeys, newKeys)
      for (const key of keysToDelete) {
        storeObj.delete(key)
      }
    }
  })
}

export function zeropad (value, ndigits = 2) {
  return (value + '').padStart(ndigits, '0')
}

export function getUTCWeekStartDate (dateStr) {
  // Returns yyyy-mm-dd for start date of week
  const dateObj = new Date(dateStr)
  dateObj.setUTCDate(dateObj.getUTCDate() - dateObj.getUTCDay())
  return dateObj.toISOString().split('T')[0]
}

export function date2hhmmISO (date) {
  return (date ? new Date(date) : new Date()).toISOString().substring(0, 16) + 'Z'
}

export function convertDate2Timezone (date, timezone) {
  try {
    return new Date(new Date(date).toLocaleString('en-US', { timeZone: timezone }))
  } catch (err) {
    return null
  }
}

const START_TIME_FUNC = { [MOTD_TAG]: getDayStartTime, [MOTW_TAG]: getWeekStartTime, [MOTM_TAG]: getMonthStartTime }

export function equalForTimezone (compareType, date1, date2, timezone) {
  // Checks equality of components of two dates for specified timezone
  // compareType = MOTD_TAG, MOTW_TAG, or MOTM_TAG
  // Specify timezone = 'UTC' for special UTC time comparison
  // If timezone is omitted or null, defaults to default local timezone comparison
  // If timezone is invalid, defaults to UTC comparison
  date1 = new Date(date1)
  date2 = new Date(date2)

  let UTCtime = false

  if (timezone) {
    UTCtime = true

    if (timezone.toLowerCase() !== 'utc') {
      // Convert to specified timezone
      const newDate1 = convertDate2Timezone(date1, timezone)
      const newDate2 = convertDate2Timezone(date2, timezone)
      if (newDate1 && newDate2) {
        date1 = newDate1
        date2 = newDate2
        UTCtime = false
      }
    }
  }

  const getFunc = START_TIME_FUNC[compareType]
  return getFunc(date1, UTCtime).getTime() === getFunc(date2, UTCtime).getTime()
}

export function getDayStartTime (date, UTCtime) {
  // Returns date value for 00:00 today
  const dateObj = new Date(date)
  if (UTCtime) {
    dateObj.setUTCHours(0, 0, 0, 0)
  } else {
    dateObj.setHours(0, 0, 0, 0)
  }
  return dateObj
}

export function getWeekStartTime (date, UTCtime) {
  // Returns date value for Sunday, 00:00
  const dateObj = getDayStartTime(date, UTCtime)
  if (UTCtime) {
    dateObj.setUTCDate(dateObj.getUTCDate() - dateObj.getUTCDay())
  } else {
    dateObj.setDate(dateObj.getDate() - dateObj.getDay())
  }
  return dateObj
}

export function getMonthStartTime (date, UTCtime) {
  // Returns date value first day of month, 00:00
  const dateObj = getDayStartTime(date, UTCtime)
  if (UTCtime) {
    dateObj.setUTCDate(1)
  } else {
    dateObj.setDate(1)
  }
  return dateObj
}

export function hhmm2localTime (HHcMM, beforeEpoch) {
  const [hh, mm] = HHcMM.split(':')
  const dateObj = new Date()
  dateObj.setHours(parseInt(hh), parseInt(mm), 0, 0)

  beforeEpoch = beforeEpoch || new Date().getTime()
  while (dateObj.getTime() >= beforeEpoch) {
    dateObj.setDate(dateObj.getDate() - 1)
  }
  return dateObj
}

export function offsetDaysInDate (dateVal, offset) {
  // Offset date while preserving time of day
  const dateObj = new Date(dateVal)
  dateObj.setDate(dateObj.getDate() + offset)
  return dateObj.toISOString().substring(0, 16) + 'Z'
}

const MINS_PER_DAY = 24 * 60
export function nextTimeInterval (lastInterval, updateMinutes) {
  // Returns yyyy-mm-ddThh:mmZ for next interval start
  let dateStr = lastInterval.split('T')[0]
  const lastHH = parseInt(lastInterval.substring(11, 13))
  const lastMM = parseInt(lastInterval.substring(14, 16))
  const lastMinutes = lastHH * 60 + lastMM
  let nextMinutes = lastMinutes + updateMinutes
  if (nextMinutes >= MINS_PER_DAY) {
    nextMinutes = nextMinutes - MINS_PER_DAY
    const dateObj = new Date(dateStr + 'T00:00Z')
    dateObj.setDate(dateObj.getDate() + 1)
    dateStr = dateObj.toISOString().split('T')[0]
  }
  // console.log('nextInterval', lastInterval.substring(0,16)+'Z', lastMinutes, nextMinutes, zeropad(Math.trunc(nextMinutes/60)), zeropad(nextMinutes % 60))

  return `${dateStr}T${zeropad(Math.trunc(nextMinutes / 60))}:${zeropad(nextMinutes % 60)}Z`
}
