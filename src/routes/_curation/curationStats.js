import { store } from '../_store/store.js'

import { USER_TOPICS_KEY, MAX_AMP_FACTOR, MIN_AMP_FACTOR, UPDATE_INTERVAL_MINUTES, INTERVALS_PER_DAY, MOTD_MIN_MAHOOT_NUMBER, nextInterval, oldestInterval, getEditionTimeStrs, getSelfUser, getMyUsername } from './curationGeneral.js'

import { getSummaries, newUserFilter, getFilter, setFilter, getCurrentFollows } from './curationCache.js'

import { MOT_TAGS } from './curationStore.js'
import { countTotalPosts, isPriorityStatus, curateSingleStatus } from './curationFilter.js'

import { getSnowflakeDate } from './curationSnowflakeId.js'

import { HmacHex } from '../_thirdparty/HMAC/HMAC.js'

const STATUS_STATS_PROTO = { boost_count: 0, fboost_count: 0, reblogs_count: 0 }

export const TIMELINE_ACCUM_PROTO = {
  userEntry: null,
  boost_total: 0,
  reblog2_total: 0,
  motx_total: 0,
  priority_total: 0,
  post_total: 0,
  engaged_total: 0,
  weight: 0,
  follow_weight: 1,
  normalized_daily: 0,
  followed_at: ''
}

export function newUserAccum (obj) {
  return { ...TIMELINE_ACCUM_PROTO, ...(obj || {}) }
}

export async function computePostStats () {
  const { currentInstance, curationLastSaveInterval } = store.get()

  const selfUser = getSelfUser()
  const myUsername = selfUser.username

  if (!curationLastSaveInterval) {
    console.log('computePostStats: NO STATUSES TO ANALYZE')
    return null
  }

  console.log('computePostStats:', curationLastSaveInterval)

  const summaryCache = {}
  const statusStats = {}

  const editionCount = getEditionTimeStrs().length

  const currentFollows = getCurrentFollows()
  const currentFilter = getFilter()
  const [currentStats, currentProbs] = currentFilter || [null, null]

  let prevDate = 0
  let newDate = false

  let savedCount = 0
  let droppedCount = 0
  let shownCount = 0

  let savedTotal = 0
  let shownTotal = 0
  let highBoostTotal = 0

  const statusCounter = {}

  let processedStatuses = 0

  const finalIntervalEnd = nextInterval(curationLastSaveInterval)

  let intervalStr = oldestInterval(curationLastSaveInterval)

  const userAccum = {}

  // Track stats for self-user
  // Include self in user filter to track statistics
  const userEntry = newUserFilter({
    altname: 'user_0000',
    acct_id: selfUser.acct_id,
    topics: selfUser[USER_TOPICS_KEY],
    amp_factor: 1
  })
  userAccum[myUsername] = newUserAccum({ userEntry })

  let intervalCount = 0
  const intervalStats = []
  while (intervalStr < finalIntervalEnd) {
    const nextIntervalStr = nextInterval(intervalStr)
    const statusSummaries = await getSummaries(intervalStr, nextIntervalStr)

    /// console.log('computePostStats ANALYZE', intervalCount, statusSummaries.length, intervalStr, nextIntervalStr, finalIntervalEnd)
    intervalStr = nextIntervalStr

    if (!statusSummaries.length) {
      // Skip empty interval (assuming missed data)
      continue
    }

    let shownInterval = 0
    for (const summary of statusSummaries) {
      const modStatus = curateSingleStatus(summary, currentInstance, currentFollows, currentStats, currentProbs, editionCount)

      const statusDate = getSnowflakeDate(summary.id).getDate()

      if (!modStatus.curation_dropped || modStatus.curation_save) {
        // Count of shown statuses for interval
        shownInterval += 1
      }

      if (!prevDate) {
        prevDate = statusDate
      } else if (prevDate !== statusDate) {
        // Reset counters for new date
        prevDate = statusDate
        newDate = true
        savedCount = 0
        droppedCount = 0
        shownCount = 0
      }
      if (newDate) {
        if (modStatus.curation_save) {
          savedCount += 1
          savedTotal += 1
          statusCounter[summary.id] = savedCount + 'E'
        } else if (modStatus.curation_dropped) {
          droppedCount += 1
          statusCounter[summary.id] = droppedCount + 'D'
        } else {
          shownCount += 1
          shownTotal += 1
          statusCounter[summary.id] = shownCount
          if (modStatus.curation_high_boost) {
            highBoostTotal += 1
            statusCounter[summary.id] += 'HB'
          }
        }
      }
    }

    computeIntervalStats(currentFollows, statusSummaries, summaryCache, statusStats)
    processedStatuses += statusSummaries.length
    intervalCount += 1
    intervalStats.push({ shownInterval, statusInterval: statusSummaries.length })
  }

  if (intervalCount) {
    accumulateStatusCounts(currentFollows, userAccum, summaryCache, statusStats)

    const dayTotal = intervalCount / INTERVALS_PER_DAY

    const lastDayStats = intervalStats.slice(-INTERVALS_PER_DAY)
    const lastDayFac = INTERVALS_PER_DAY / lastDayStats.length
    const globalStats = {
      time_str: finalIntervalEnd,
      day_total: dayTotal,
      status_total: processedStatuses,
      status_daily: processedStatuses / dayTotal,
      editioned_daily: savedTotal / dayTotal,
      dropped_daily: droppedCount / dayTotal,
      shown_daily: shownTotal / dayTotal,
      high_boosted_daily: highBoostTotal / dayTotal,
      shown_lastday: lastDayFac * lastDayStats.reduce((acc, x) => acc + x.shownInterval, 0),
      status_lastday: lastDayFac * lastDayStats.reduce((acc, x) => acc + x.statusInterval, 0)
    }

    const [moreGlobalStats, userFilter] = computeUserProbabilities(currentFollows, intervalCount, finalIntervalEnd, statusStats, userAccum)

    setFilter([{ ...globalStats, ...moreGlobalStats }, userFilter])

    store.set({ curationFilterTime: new Date() + '', curationPostsPerDay: globalStats.status_daily.toFixed(0) })
    console.log('computePostStats; STATS', globalStats, moreGlobalStats)
  }

  return statusCounter
}

function computeIntervalStats (currentFollows, statusSummaries, summaryCache, statusStats) {
  for (const summary of statusSummaries) {
    summaryCache[summary.id] = {
      username: summary.username,
      tags: summary.tags,
      reblog_id: summary.reblog_id,
      reblogs_count: summary.reblogs_count,
      self_reply: summary.self_reply || 0,
      engaged: (summary.booster_reblogged || summary.booster_favourited || summary.reblogged || summary.favourited || summary.bookmarked) ? 1 : 0
    }

    if (summary.reblog_id) {
      const boostedId = summary.reblog_id
      if (!(boostedId in statusStats)) {
        statusStats[boostedId] = { ...STATUS_STATS_PROTO }
      }
      statusStats[boostedId].boost_count += 1
      statusStats[boostedId].reblogs_count += summary.reblogs_count

      if (summary.username in currentFollows) {
        // Boost by followee
        statusStats[boostedId].fboost_count += 1
      }
    } else {
      // Post from followee
      statusStats[summary.id] = { ...STATUS_STATS_PROTO }
    }
  }
}

function accumulateStatusCounts (currentFollows, userAccum, summaryCache, statusStats) {
  const { curationHideSelfReplies, curationSecretKey } = store.get()

  for (const statusId of Object.keys(summaryCache)) {
    const summaryInfo = summaryCache[statusId]
    const username = summaryInfo.username

    const follow = currentFollows[username] || null

    if (!(username in userAccum)) {
      // No stats yet for user; check if following user
      if (!follow) {
        // Skip unfollowed (non-self) user
        // TODO: hashtag following
        continue
      }
      // Post/boost from followee
      // TODO: search tags of the post and treat tag follows like user follows

      const altname = 'user_' + HmacHex(curationSecretKey, 'anonymize_' + username).slice(-4)

      const userEntry = newUserFilter({
        altname,
        acct_id: follow.acct_id,
        topics: follow[USER_TOPICS_KEY] || '',
        amp_factor: Math.min(MAX_AMP_FACTOR, Math.max(MIN_AMP_FACTOR, follow.amp_factor))
      })
      userAccum[username] = newUserAccum({ userEntry, followed_at: follow.followed_at })
    }

    const accum = userAccum[username]

    if (summaryInfo.reblog_id) {
      // Reblog count
      const statusInfo = statusStats[summaryInfo.reblog_id]

      if (statusInfo) {
        // Total boosted post count
        accum.boost_total += 1
        // Total log2(1+reblog count) associated with boosted posts (NOTE: THIS IS A SNAPSHOT VALUE)
        accum.reblog2_total += Math.log2(1 + statusInfo.reblogs_count)
      }
    } else {
      // Post count (not reblog)
      const motx = summaryInfo.tags.some((tag) => MOT_TAGS.includes(tag))

      // TODO: a better way to indicate priority
      const priority = isPriorityStatus(summaryInfo, accum.topics)

      if (motx) {
        accum.motx_total += 1
      } else if (priority) {
        accum.priority_total += 1
      } else if (!(curationHideSelfReplies && summaryInfo.self_reply)) {
        // Do not count plain self replies, if they are not displayed)
        accum.post_total += 1
      }
    }

    accum.engaged_total += summaryInfo.engaged
  }
}

function computeUserProbabilities (currentFollows, intervalCount, finalIntervalEnd, statusStats, userAccum) {
  const { curationViewsPerDay } = store.get()
  const myUsername = getMyUsername()

  let maxViewsPerDay = parseInt(curationViewsPerDay)

  if (!maxViewsPerDay || maxViewsPerDay < 10 || maxViewsPerDay > 9999) {
    maxViewsPerDay = Math.max(10, Math.min(9999, maxViewsPerDay || 10))
    store.set({ curationViewsPerDay: maxViewsPerDay })
  }

  const dayTotal = intervalCount / INTERVALS_PER_DAY
  const finalIntervalEndTime = new Date(finalIntervalEnd)
  const statPeriodMS = intervalCount * UPDATE_INTERVAL_MINUTES * 60 * 1000

  const accumEntries = Object.entries(userAccum)

  let totalUserWeight = 0
  let totalWeightedDaily = 0

  for (const [, accum] of accumEntries) {
    const userEntry = accum.userEntry

    if (accum.followed_at) {
      accum.weight = userEntry.amp_factor

      // Also weight followee by how long they have been followed over the analysis period (0.1 ... 1)
      accum.follow_weight = Math.min(1, Math.max(0.1, (finalIntervalEndTime.getTime() - (new Date(accum.followed_at)).getTime()) / statPeriodMS))
    } else {
      // Do not count unfollowed user (or self) posts/boosts
      // TODO: search tags of the post and treat tag follows like user follows
      accum.weight = 0
      accum.follow_weight = 1
    }

    // Extrapolate post count for recent follows
    for (const prefix of ['motx', 'priority', 'post', 'boost', 'reblog2', 'engaged']) {
      userEntry[prefix + '_daily'] = accum[prefix + '_total'] / (accum.follow_weight * dayTotal)
    }

    userEntry.total_daily = countTotalPosts(userEntry)

    // Normalize extrapolated post count by amp factor (i.e., spread it out for amp ups)
    accum.normalized_daily = accum.weight ? userEntry.total_daily / accum.weight : 0

    totalUserWeight += accum.weight
    totalWeightedDaily += accum.weight * accum.normalized_daily
  }

  // Sort by normalized view count, i.e, count divided by amp factor (and follow time weight)
  accumEntries.sort((a, b) => a[1].normalized_daily - b[1].normalized_daily)

  // Mahoot number: guaranteed views per day
  let mahootNumber
  if (maxViewsPerDay >= totalWeightedDaily) {
    // Can view all posts; use maximum normalized post count as Mahoot number
    mahootNumber = accumEntries[accumEntries.length - 1][1].normalized_daily
  } else {
    // Iterate to compute Mahoot number
    mahootNumber = maxViewsPerDay / totalUserWeight

    let postAccum = 0
    let weightAccum = 0
    for (const [, accum] of accumEntries) {
      if (!accum.weight) {
        // Ignore unweighted user
        continue
      }

      // Guaranteed view per user (or "average" views per active user)
      mahootNumber = (maxViewsPerDay - postAccum) / (totalUserWeight - weightAccum)

      // Normalized user post count exceeds guaranteed views per user; stop
      if (accum.normalized_daily > mahootNumber) { break }

      postAccum += accum.weight * accum.normalized_daily

      weightAccum += accum.weight
    }
  }

  for (const [username, accum] of accumEntries) {
    const userEntry = accum.userEntry

    // Estimate "net" probability using normalized_daily count (used for display purposes only; not for actual filtering)
    const netCount = (username === myUsername) ? userEntry.total_daily : accum.normalized_daily
    userEntry.net_prob = Math.min(1, mahootNumber / Math.max(1, netCount))

    // Count of regular posts and boosts (excluding MOTx/priority)
    const regularPostsPlusBoosts = Math.max(1, userEntry.post_daily + userEntry.boost_daily)

    const userMahootNumber = mahootNumber * (accum.weight || 1)
    let availableViews = userMahootNumber - userEntry.motx_daily

    if (userMahootNumber < MOTD_MIN_MAHOOT_NUMBER) {
      // Viewing less than MOTD_MIN posts per day for followee; #MOTD will be treated as just priority by filter
      availableViews = userMahootNumber - Math.min(1 / 7 + 1 / 30, userEntry.motx_daily) // Assume only #MOTW and #MOTM
    }

    if (availableViews <= 0) {
      // All views consumed by MOTx posts
      userEntry.priority_prob = 0
      userEntry.post_prob = 0
    } else if (userEntry.priority_daily >= availableViews) {
      // All views consumed by priority posts
      userEntry.priority_prob = Math.min(1, availableViews / userEntry.priority_daily)
      userEntry.post_prob = 0
    } else {
      // Some views available for regular posts
      userEntry.priority_prob = 1.0
      userEntry.post_prob = Math.min(1, (availableViews - userEntry.priority_daily) / regularPostsPlusBoosts)
    }

    userEntry.reblog2_avg = userEntry.reblog2_daily / Math.max(1, userEntry.boost_daily)
  }

  const userFilter = Object.entries(userAccum).reduce((obj, val) => ({ ...obj, [val[0]]: val[1].userEntry }), {})

  console.log('computeUserProbabilities: MAHOOT#', mahootNumber.toFixed(2), maxViewsPerDay, intervalCount)

  return [{ mahoot_number: mahootNumber }, userFilter]
}
