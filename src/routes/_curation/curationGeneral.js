import { store } from '../_store/store.js'

import { offsetDaysInDate, nextTimeInterval, hhmm2localTime } from './curationStore.js'

import { USER_FOLLOW_UPDATE, getSummary, setSummary, getSummaryKey, newUserFollow } from './curationCache.js'

export const MAHOOT_CODE_VERSION = '0.3.10'

export const MAHOOT_DATA_VERSION = '0.3'

export const UPDATE_INTERVAL_MINUTES = 120 // Interval for updating status summaries

export const UPDATE_DELAY_SEC = 600 // Wait time to allow a post to appear to trigger status buffer update for new interval

export const PAGED_REQUEST_DELAY_SEC = 5 // Mastodon limit of 300 requests over 15 minutes for paged (status?) data => 3 sec or more delay

export const RETRY_UPDATE_SEC = 300 // Wait time before retrying status buffer updates

export const MINS_PER_DAY = 24 * 60

export const INTERVALS_PER_DAY = Math.floor(MINS_PER_DAY / UPDATE_INTERVAL_MINUTES)

export const USER_MAHOOT_KEY = 'mahoot'
export const USER_TOPICS_KEY = 'topics'
export const USER_TIMEZONE_KEY = 'tz'

export const MAX_AMP_FACTOR = 64

export const MIN_AMP_FACTOR = 1.0 / 64

// If user Mahoot number is less than this value, #MOTD will be treated as just a priority tag
export const MOTD_MIN_MAHOOT_NUMBER = 1.0

export const STATUS_REQUEST_LIMIT = 40

// "Absolute maximum" days of data to analyze
const DAYS_OF_DATA_LIMIT = 60

export function curationConsole (...args) {
  curationConsoleAux(...args).then(args => console.log(...args))
}

async function curationConsoleAux (...args) {
  return ['curationConsole '].concat(args)
}

export function getSelfUser () {
  const { currentInstance, verifyCredentials } = store.get()
  const userFollow = newUserFollow()
  const myCreds = verifyCredentials && verifyCredentials[currentInstance] ? verifyCredentials[currentInstance] : null
  if (!myCreds) {
    return userFollow
  }
  userFollow.username = myCreds.acct.toLowerCase()
  userFollow.acct = myCreds.acct
  userFollow.acct_id = myCreds.id

  for (const key of USER_FOLLOW_UPDATE) {
    userFollow[key] = myCreds[key] || ''
  }

  const plaintextNote = (myCreds.source && myCreds.source.note) || ''
  updateBioInfo(userFollow, plaintextNote)
  return userFollow
}

export function updateBioInfo (userFollow, plaintextNote) {
  const temFollow = {}
  temFollow[USER_MAHOOT_KEY] = extractBioInfo(USER_MAHOOT_KEY, plaintextNote)
  temFollow[USER_TOPICS_KEY] = extractBioInfo(USER_TOPICS_KEY, plaintextNote).replace(/#/g, '').replace(/\s+/g, ' ').trim()
  temFollow[USER_TIMEZONE_KEY] = extractBioInfo(USER_TIMEZONE_KEY, plaintextNote) || 'UTC'

  let update = ''
  for (const key of [USER_MAHOOT_KEY, USER_TOPICS_KEY, USER_TIMEZONE_KEY]) {
    if (userFollow[key] !== temFollow[key]) {
      userFollow[key] = temFollow[key]
      update += key + ','
    }
  }
  return update
}

function extractBioInfo (key, text) {
  // Matches [key]: word_optionally_starting_with_#_and_including_slash followed by zero or comma-separated hashtags/words or more space-separated hashtags
  const regex = new RegExp('\\b' + key + ':\\s*(([/#\\w]+)((\\s*,\\s*#?\\w*|\\s+#\\w+))*\\b)', 'i')
  const match = text.match(regex)
  /// console.log('extractBioInfo', match, regex, key, text)
  // Replace comma separation with single space separation
  return match ? match[1].replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ').trim() : ''
}

export function getMyUsername () {
  const { currentInstance, verifyCredentials } = store.get()
  return verifyCredentials[currentInstance] ? verifyCredentials[currentInstance].acct.toLowerCase() : ''
}

export function nextInterval (lastIntervalStr) {
  return nextTimeInterval(lastIntervalStr, UPDATE_INTERVAL_MINUTES)
}

export function oldestInterval (lastIntervalStr) {
  return offsetDaysInDate(nextInterval(lastIntervalStr), -getMaxDaysOfData())
}

export function getMaxDaysOfData () {
  const { curationDaysOfData } = store.get()
  let maxDaysOfData = parseInt(curationDaysOfData)

  if (!maxDaysOfData || maxDaysOfData < 1 || maxDaysOfData > DAYS_OF_DATA_LIMIT || maxDaysOfData !== curationDaysOfData) {
    maxDaysOfData = Math.max(1, Math.min(DAYS_OF_DATA_LIMIT, maxDaysOfData || 1))
    store.set({ curationDaysOfData: maxDaysOfData })
  }
  return maxDaysOfData
}

export function roundCount (value, trimZero) {
  let result
  if (Math.abs(value) < 1) {
    result = value.toFixed(2)
    if (trimZero && result.endsWith('0')) result = result.slice(0, -1)
  } else if (Math.abs(value) < 10) {
    result = value.toFixed(1)
    if (trimZero && result.endsWith('.0')) result = result.slice(0, -2)
  } else {
    result = value.toFixed(0)
  }
  return result
}

export function roundPercent (value) {
  return roundCount(100 * value) + '%'
}

export function getHashtags (text, lowerCase) {
  if (lowerCase) text = text.toLowerCase()
  const matches = text.match(/(^|[^\w#])#\w+\b/gi)
  if (matches) {
    return matches.map(x => x.startsWith('#') ? x.substr(1) : x.substr(2))
  } else {
    return []
  }
}

export function getDigestUsers () {
  // Entries: name1@server1#DigestTopic, name2@server2#DigestTopic2, ...
  const { curationDigestUsers } = store.get()
  const testEntries = curationDigestUsers.split(',').map(s => s.trim()).map(s => s.startsWith('@') ? s.substr(1) : s).filter(s => s)
  const testUsers = {}
  for (const entry of testEntries) {
    const comps = entry.split('#')
    testUsers[comps[0].toLowerCase()] = comps.length > 1 ? '#' + comps[1] : '#'
  }
  return testUsers
}

export function getEditionTimeStrs () {
  const { curationEditionTime } = store.get()
  let editionTimeStrs = []
  let editionTimes = []

  if (curationEditionTime) {
    let invalid = ''
    try {
      editionTimeStrs = curationEditionTime.split(',').map(hhmm => hhmm.trim())
      editionTimes = editionTimeStrs.map(hhmm => hhmm2localTime(hhmm))
      invalid = editionTimes.some(time => !time) && 'One or more time(s) not valid ' + editionTimes
    } catch (err) {
      invalid = 'error ' + err.message
    }
    if (invalid) {
      console.log('getEditionTimeStr: Invalid edition time', curationEditionTime, invalid)
      if (curationEditionTime && !curationEditionTime.startsWith('Invalid')) {
        store.set({ curationEditionTime: 'Invalid: ' + curationEditionTime })
      }
    }
  }
  return editionTimeStrs
}

const BOOSTER_PREFIX = 'booster_'
const BOOSTER_KEYS = ['reblogged', 'favourited']

export function summarizeStatus (status) {
  const summary = {
    id: status.id,
    username: status.account.acct.toLowerCase()
  }
  if (status.reblog) {
    summary.orig_username = status.reblog.account.acct.toLowerCase()
    summary.reblog_id = status.reblog.id
    summary.reblogs_count = status.reblog.reblogs_count
    summary.replies_count = status.reblog.replies_count
    summary.mentions = []
    summary.in_reply_to_id = ''
    summary.self_reply = 0
    summary.tags = status.reblog.tags.map(x => x.name.toLowerCase())
  } else {
    const selfReply = status.in_reply_to_id && status.in_reply_to_account_id === status.account.id
    summary.orig_username = ''
    summary.reblog_id = ''
    summary.reblogs_count = status.reblogs_count
    summary.replies_count = status.replies_count
    summary.mentions = status.mentions.map(x => x.acct.toLowerCase())
    summary.in_reply_to_id = status.in_reply_to_id
    summary.self_reply = selfReply ? 1 : 0
    summary.tags = status.tags.map(x => x.name.toLowerCase())
  }
  summary.bookmarked = status.bookmarked ? 1 : 0
  summary.favourited = status.favourited ? 1 : 0
  summary.reblogged = status.reblogged ? 1 : 0

  // Give engagement credit to booster for reblogging/favouriting (not just to original poster)
  for (const key of BOOSTER_KEYS) {
    summary[BOOSTER_PREFIX + key] = false
  }

  return summary
  /// console.log('SUMMARY', summary)
}

export function isFollowOrSelf (username, currentFollows) {
  return (username in currentFollows) || (username === getMyUsername())
}

export async function bufferStatusSummaryAsync (currentFollows, currentTagFollows, summary) {
  if (!isFollowOrSelf(summary.username, currentFollows)) {
    // TODO: Follow hashtags as if they were users
    return
  }

  const result = await getSummaryKey(summary.id)
  if (result && result.length) {
    // Already buffered
    return
  }

  setSummary(summary.id, summary)
}

export async function bufferStatusSummarySync (currentFollows, currentTagFollows, summary) {
  if (!isFollowOrSelf(summary.username, currentFollows)) {
    // TODO: Follow hashtags as if they were users
    return false
  }

  await setSummary(summary.id, summary)
  return true
}

export async function updateStatusSummary (statusId, key, value) {
  let summary = await getSummary(statusId)
  if (!summary) {
    return
  }
  if (summary.reblog_id && BOOSTER_KEYS.includes(key)) {
    // Give engagement credit to booster for reblogging/favouriting (not just to original poster)
    summary[BOOSTER_PREFIX + key] = value
    setSummary(summary.id, summary)

    summary = await getSummary(summary.reblog_id)
    if (!summary) {
      return
    }
  }
  summary[key] = value
  setSummary(summary.id, summary)
}
