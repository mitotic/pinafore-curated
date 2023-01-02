import { store } from '../_store/store.js'

import { getFollows } from '../_api/followsAndFollowers.js'
import { difference } from '../_thirdparty/lodash/objects.js'

import { date2hhmmISO, offsetDaysInDate } from './curationStore.js'
import { USER_FOLLOW_UPDATE, setParam, getParam, newUserFollow, removeUserFollow, setUserFollow, getCurrentFollows } from './curationCache.js'

import { updateBioInfo } from './curationGeneral.js'

const { loggedInInstances, currentInstance, verifyCredentials } = store.get()

const FOLLOWS_REFRESH_TIME = 'followsRefreshTime'

export async function refreshCurationFollows (force) {
  // Create/update user DB
  const currentFollows = getCurrentFollows()

  if (!force && Object.keys(currentFollows).length) {
    const lastRefreshTime = new Date(getParam(FOLLOWS_REFRESH_TIME) || 0)
    if ((Date.now() - lastRefreshTime.getTime()) < 3600 * 1000) {
      // Less than an hour since the last refresh
      return
    }
  }

  const accessToken = loggedInInstances[currentInstance].access_token
  const accountId = verifyCredentials[currentInstance].id

  const newFollows = await getFollows(currentInstance, accessToken, accountId)

  const newKeys = newFollows.map(({ acct }) => acct.toLowerCase())

  const keysToDelete = difference(Object.keys(currentFollows), newKeys)
  if (keysToDelete.length) {
    console.log('refreshCurationFollows: Deleting users', keysToDelete)
    for (const key of keysToDelete) {
      removeUserFollow(key)
    }
  }

  console.log('refreshCurationFollows', currentInstance, verifyCredentials[currentInstance].acct, newFollows.length)

  for (const [k, newFollow] of Object.entries(newFollows)) {
    const username = newKeys[k]

    const plaintextNote = newFollow.plaintext_note || ''

    let userFollow = currentFollows[username]

    let update = userFollow ? updateBioInfo(userFollow, plaintextNote) : '_NEW_'

    if (userFollow) {
      // Current follow
      for (const key of USER_FOLLOW_UPDATE) {
        if (userFollow[key] !== newFollow[key]) {
          userFollow[key] = newFollow[key]
          update += key + ','
        }
      }
    } else {
      // New follow
      userFollow = newUserFollow({
        username,
        acct: newFollow.acct,
        acct_id: newFollow.id
      })

      updateBioInfo(userFollow, plaintextNote)
      for (const key of USER_FOLLOW_UPDATE) {
        userFollow[key] = newFollow[key]
      }

      // Pretend user was followed a day ago (since we usually have about a day of data available initially)
      userFollow.followed_at = date2hhmmISO(new Date(offsetDaysInDate(new Date(), -1)))

      /// console.log('refreshCurationFollows: New user', username, userFollow)
    }

    if (update) {
      setUserFollow(username, userFollow)
      console.log('refreshCurationFollows: Updating user', username, update, newFollow, userFollow)
    }
  }
  setParam(FOLLOWS_REFRESH_TIME, date2hhmmISO())
  console.log('refreshCurationFollows: COMPLETED')
}
