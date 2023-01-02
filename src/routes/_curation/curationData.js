import { CURATION_SETTINGS, store } from '../_store/store.js'

import { clearStore, date2hhmmISO } from './curationStore.js'
import { clearAllCached, getStatuses, getCurrentFollows, setUserFollow, setStatus } from './curationCache.js'
import { CURATION_STATUSBUFFER_STORE, CURATION_STATUSEDITION_STORE } from '../_database/constants.js'

import { MAHOOT_DATA_VERSION, curationConsole, getMyUsername } from './curationGeneral.js'

import { getSnowflakeDate } from './curationSnowflakeId.js'

export function eraseCurationData () {
  const { currentInstance } = store.get()
  clearAllCached('')
  console.log('eraseAllData: Erased data in localStorage')
  for (const storeName of [CURATION_STATUSBUFFER_STORE, CURATION_STATUSEDITION_STORE]) {
    clearStore(currentInstance, storeName).then((response) => { console.log('eraseAllData: Cleared ' + storeName) })
  }
  store.set({ curationLastSaveInterval: '', curationDataVersion: MAHOOT_DATA_VERSION })
}

export async function exportCurationData () {
  const follows = getCurrentFollows()
  const followsList = Object.values(follows)

  followsList.sort((a, b) => (a.username > b.username) ? 1 : -1)

  const statuses = await getStatuses('2022-12-01T00:00Z', date2hhmmISO(), true)
  statuses.sort((a, b) => a.id - b.id)

  console.log('exportCurationData: statuses', followsList.length, statuses.length)

  const paramObj = {}
  paramObj.mahoot_data_version = MAHOOT_DATA_VERSION
  paramObj.username = getMyUsername()

  for (const setting of Object.keys(CURATION_SETTINGS)) {
    paramObj[setting] = store.get()[setting]
  }
  paramObj.follows_count = followsList.length
  paramObj.post_count = statuses.length
  if (statuses.length) {
    paramObj.earliest_post = getSnowflakeDate(statuses[0].id)
    paramObj.latest_post = getSnowflakeDate(statuses[statuses.length - 1].id)
  }

  const paramString = JSON.stringify(paramObj)
  const followsString = '[\n  ' + followsList.map(x => JSON.stringify(x)).join(',\n  ') + '\n]'
  const statusString = '[\n  ' + statuses.map(x => JSON.stringify(x)).join(',\n  ') + '\n]'
  const jsonString = '[\n' + paramString + ',\n' + followsString + ',\n' + statusString + '\n]'

  return jsonString
}

export function importCurationData (jsonString) {
  let errMsg, jsonObj

  try {
    jsonObj = JSON.parse(jsonString)
  } catch (err) {
    errMsg = err.message
    console.log('importCurationData:', errMsg)
    return errMsg
  }

  const paramObj = jsonObj[0]

  if (!paramObj.mahoot_data_version || paramObj.mahoot_data_version !== MAHOOT_DATA_VERSION) {
    errMsg = `VERSION MISMATCH ${paramObj.mahoot_data_version} !== ${MAHOOT_DATA_VERSION}`
    console.log('importCurationData:', errMsg)
    return errMsg
  }
  if (!paramObj.username || paramObj.username !== getMyUsername()) {
    errMsg = `USER MISMATCH ${paramObj.username} != ${getMyUsername()}`
    console.log('importCurationData:', errMsg)
    return errMsg
  }

  const followsList = jsonObj[1]
  const statuses = jsonObj[2]
  console.log('importCurationData:', paramObj, followsList.length, statuses.length)

  // Import user preferences
  for (const follow of followsList) {
    setUserFollow(follow.username, follow)
  }

  importStatusSummaries(statuses)

  // Import settings
  const setObj = {}
  for (const setting of Object.keys(CURATION_SETTINGS)) {
    if (setting in paramObj) {
      setObj[setting] = paramObj[setting]
    } else {
      setObj[setting] = CURATION_SETTINGS[setting]
    }
  }

  store.set(setObj)

  return ''
}

async function importStatusSummaries (summaries) {
  console.log('importStatusSummaries: Starting importing', summaries.length, 'summaries')

  let j = 0
  for (const summary of summaries) {
    await setStatus(summary.id, summary)
    j += 1
    if (!(j % 1000)) {
      console.log('importStatusSummaries: Imported', j)
      store.set({ curationUpdatingMessage: 'Status: Imported ' + j + ' of ' + summaries.length + ' summaries' })
    }
  }
  curationConsole('importStatusSummaries: Completed importing', summaries.length, 'summaries')
  store.set({ curationUpdatingMessage: 'Status: Completed importing ' + summaries.length + ' summaries' })
}
