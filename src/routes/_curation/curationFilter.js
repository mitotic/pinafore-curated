import { store } from '../_store/store.js'
import { CURATION_STATUSEDITION_AGO } from '../_static/database.js'

import { createSnowflakeId, getSnowflakeEpoch } from './curationSnowflakeId.js'

import { setUserFollow } from './curationCache.js'
import { USER_TOPICS_KEY, USER_TIMEZONE_KEY, MOTD_MIN_MAHOOT_NUMBER, getDigestUsers } from './curationGeneral.js'
import { MOTD_TAG, MOTX_TAG, MOT_TAGS, DIGEST_TAG, NODIGEST_TAG, PRIORITY_TAG, equalForTimezone } from './curationStore.js'

import { HmacRandom } from '../_thirdparty/HMAC/HMAC.js'

const { verifyCredentials } = store.get()

let lastCurationId = ''
let lastCurationSeq = 0

function getCurationId () {
  let curationId = createSnowflakeId(null, lastCurationSeq)
  if (curationId === lastCurationId) {
    // Handle curation Id conflicts (TEMPORARY; need to check data store for conflicts)
    lastCurationSeq = (lastCurationSeq + 1) % 65536
    curationId = createSnowflakeId(null, lastCurationSeq)
  }
  lastCurationId = curationId
  return curationId
}

export function countTotalPosts (userEntry) {
  // motx_daily + priority_daily + post_daily + boost_daily
  return userEntry.motx_daily + userEntry.priority_daily + userEntry.post_daily + userEntry.boost_daily
}

export function isPriorityStatus (statusSummary, topics) {
  // topics may be CamelCased
  if (statusSummary.reblog_id) {
    return false
  }
  if (statusSummary.tags.includes(PRIORITY_TAG)) {
    return true
  }
  const topicsList = (topics || '').toLowerCase().split(' ').filter(s => s)
  if (topicsList.length) {
    // Give priority to posts on topics listed in user bio
    for (const topic of topicsList) {
      if (statusSummary.tags.includes(topic)) {
        return true
      }
    }
  } else if (statusSummary.tags.length) {
    // Give priority to all hashtagged user posts
    return true
  }
}

// Probability amplification factor for high boosts
const BOOST_AMPLIFY_FAC = 2

// Minimum number of boosts for amplification to kick in
const BOOST_AMPLIFY_MIN = 4

export function curateSingleStatus (statusSummary, instanceName, currentFollows, currentStats, currentProbs, editionCount) {
  const { curationAmplifyHighBoosts, curationHideSelfReplies, curationSecretKey } = store.get()

  const username = statusSummary.username
  const statusId = statusSummary.id

  const modStatus = { curation_tag: '' }
  modStatus.curation_id = getCurationId()

  const digestUsers = getDigestUsers()

  const myUsername = verifyCredentials[instanceName].acct.toLowerCase()

  const statusTime = getSnowflakeEpoch(statusId)

  const digestible = editionCount && !statusSummary.reblog_id && !statusSummary.tags.includes(NODIGEST_TAG) && (statusTime >= (Date.now() - CURATION_STATUSEDITION_AGO))

  if (username === myUsername || username === statusSummary.orig_username) {
    // Always display own posts or boosts of own posts

  } else if (curationHideSelfReplies && statusSummary.self_reply) {
    modStatus.curation_dropped = 'self reply'
  } else if (currentProbs) {
    // TODO: Allow all SELF mentions

    if (username in currentProbs) {
      // Currently tracking user
      const userEntry = currentProbs[username]
      const randomNum = HmacRandom(curationSecretKey, 'filter_' + myUsername + '_' + statusSummary.id)

      modStatus.curation_tag = `Posted ${Math.round(countTotalPosts(userEntry))} (boosted ${userEntry.boost_total}) with view probability ${userEntry.post_prob.toFixed(2)},`
      modStatus.curation_tag += ` out of ${currentStats.status_total} total posts in your feed over ${currentStats.day_total} days `

      const follow = currentFollows ? (currentFollows[username] || null) : null

      let priority = isPriorityStatus(statusSummary, follow[USER_TOPICS_KEY] || '')

      let motxAccept = ''

      if (follow) {
        const userTimezone = follow[USER_TIMEZONE_KEY] || 'UTC'
        modStatus.curation_tag += ` [amp factor ${follow.amp_factor}]`

        const motxFound = !statusSummary.reblog_id && statusSummary.tags.some((tag) => MOT_TAGS.includes(tag))

        if (motxFound) {
          const userMahootNumber = follow.amp_factor * currentStats.mahoot_number

          for (const tag of MOT_TAGS) {
            if (!statusSummary.tags.includes(tag)) {
              continue
            }

            if (tag === MOTD_TAG && userMahootNumber < MOTD_MIN_MAHOOT_NUMBER) {
              // Viewing less than MOTD_MIN posts per day for followee; treat #MOTD as just priority
              continue
            }

            const lastMotxId = follow[tag] || ''

            if (lastMotxId && lastMotxId !== statusId &&
                equalForTimezone(tag, statusTime, getSnowflakeEpoch(lastMotxId), userTimezone)) {
              // Tag already used for period; ignore
              continue
            }
            // First MOTx status or MOTx status already accepted or no MOTx yet posted
            motxAccept = tag

            if (!lastMotxId || lastMotxId !== statusId) {
              // Record MOTx Id
              follow[tag] = statusId
              setUserFollow(follow.username, follow)
            }
            break
          }
          if (!motxAccept) {
            // MOTx already posted/ignored; treat hashtag simply as priority
            priority = true
          }
        }
      }

      const priorityDrop = randomNum >= userEntry.priority_prob
      let regularDrop = randomNum >= userEntry.post_prob

      if (regularDrop && curationAmplifyHighBoosts &&
          statusSummary.reblogs_count > Math.max(2 ** userEntry.reblog2_avg - 1, BOOST_AMPLIFY_MIN)) {
        // Amplify acceptance of high boost (greater than geometric average) reblog counts
        regularDrop = randomNum >= BOOST_AMPLIFY_FAC * userEntry.post_prob
        if (!regularDrop) {
          modStatus.curation_high_boost = 1
        }
      }

      if (motxAccept) {
        modStatus.curation_dropped = ''
      } else if (priority) {
        modStatus.curation_dropped = priorityDrop ? 'random (priority)' : ''
      } else {
        modStatus.curation_dropped = regularDrop ? 'random (regular)' : ''
      }

      if (modStatus.curation_dropped) {
        modStatus.curation_tag += ' [Dropped ' + modStatus.curation_dropped + ']'
        /// console.log('***curationTest-post_prob DROPPED', username, userEntry.post_prob, randomNum, modStatus.curation_tag)
      } else if (digestible) {
        const digestUser = digestUsers[username] || null
        if (digestUser && (!digestUser.tag || statusSummary.tags.includes(digestUser.tag) || (motxAccept && digestUser.tag === MOTX_TAG))) {
          // Save post from digest user (with matching tag, if present) for next edition
          /// console.log("curateSingleStatus-DIGESTSAVE", username, digestUser)
          modStatus.curation_save = digestUser.section
          modStatus.curation_dropped = 'saved for edition ' + digestUser.section
        } else if (motxAccept && statusSummary.tags.includes(DIGEST_TAG)) {
          // Save MOTx post for next edition
          /// console.log("curateSingleStatus-MOTxSAVE", username, motxAccept, statusSummary)
          modStatus.curation_save = '#' + motxAccept
          modStatus.curation_dropped = 'saved for edition ' + motxAccept
        }
      }
    }
  }
  return modStatus
}
