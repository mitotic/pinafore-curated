import { store } from '../_store/store.js'

import { getFollows, getFollowedTags } from '../_api/followsAndFollowers.js'
import { followTag, unfollowTag } from '../_api/follow.js'
import { toast } from '../_components/toast/toast.js'
import { difference } from '../_thirdparty/lodash/objects.js'

import { date2hhmmISO, offsetDaysInDate } from './curationStore.js'
import { USER_FOLLOW_UPDATE, newUserFollow, removeUserFollow, setUserFollow, getCurrentFollows } from './curationCache.js'

import { updateBioInfo } from './curationGeneral.js'

export async function toggleTagFollow (tagName) {
  const { currentInstance, accessToken, curationTagsFollowed } = store.get()
  const tagIndex = curationTagsFollowed.indexOf(tagName.toLowerCase())
  try {
    let result
    if (tagIndex >= 0) {
      result = await unfollowTag(currentInstance, accessToken, tagName)
    } else {
      result = await followTag(currentInstance, accessToken, tagName)
    }
    if (tagIndex >= 0) {
      curationTagsFollowed.splice(tagIndex, 1)
    } else {
      curationTagsFollowed.push(tagName.toLowerCase())
    }
    store.set({ curationTagsFollowed })
    console.log('toggleTagFollow', result, tagName, curationTagsFollowed)
    /* no await */ toast.say((tagIndex >= 0 ? 'Unfollowed #' : 'Followed #') + tagName)
  } catch (e) {
    console.error(e)
    /* no await */ toast.say('Error in (un)following #' + tagName + ': ' + (e.message || ''))
  }
}

export async function refreshCurationFollows (force) {
  // Create/update user DB
  const { loggedInInstances, currentInstance, verifyCredentials, curationTagsAmpFactor, curationLastFollowRefresh } = store.get()
  const currentFollows = getCurrentFollows()

  if (!force && Object.keys(currentFollows).length) {
    const lastRefreshTime = new Date(curationLastFollowRefresh || 0)
    if ((Date.now() - lastRefreshTime.getTime()) < 3600 * 1000) {
      // Less than an hour since the last refresh
      return
    }
  }

  const accessToken = loggedInInstances[currentInstance].access_token
  const accountId = verifyCredentials[currentInstance].id

  const newFollows = await getFollows(currentInstance, accessToken, accountId)

  const newTags = (await getFollowedTags(currentInstance, accessToken)).map(x => x.name.toLowerCase())
  store.set({ curationTagsFollowed: newTags })

  const newKeys = newFollows.map(({ acct }) => acct.toLowerCase())
  newKeys.push(...newTags.map(x => '#' + x))

  const keysToDelete = difference(Object.keys(currentFollows), newKeys)
  if (keysToDelete.length) {
    console.log('refreshCurationFollows: Deleting users', keysToDelete)
    for (const key of keysToDelete) {
      removeUserFollow(key)
    }
  }

  console.log('refreshCurationFollows', currentInstance, verifyCredentials[currentInstance].acct, newFollows.length, newTags)

  // Pretend any new user was followed a day ago (since we usually have about a day of data available initially)
  const newFollowTime = date2hhmmISO(new Date(offsetDaysInDate(new Date(), -1)))

  for (const newTag of newTags) {
    const username = '#' + newTag
    if (username in currentFollows) {
      continue
    }

    // New tag follow
    const tagFollow = newUserFollow({
      username,
      acct: username,
      acct_id: '',
      display_name: username,
      amp_factor: curationTagsAmpFactor,
      followed_at: newFollowTime
    })

    setUserFollow(username, tagFollow)
    console.log('refreshCurationFollows: New tag', username, tagFollow)
  }

  for (const newFollow of newFollows) {
    const username = newFollow.acct.toLowerCase()
    const plaintextNote = newFollow.plaintext_note || ''

    let userFollow = currentFollows[username]

    let update = ''

    if (userFollow) {
      // Current follow
      update = updateBioInfo(userFollow, plaintextNote)
      for (const key of USER_FOLLOW_UPDATE) {
        if (userFollow[key] !== newFollow[key]) {
          userFollow[key] = newFollow[key]
          update += key + ','
        }
      }
    } else {
      // New follow
      update = '_NEW_'
      userFollow = newUserFollow({
        username,
        acct: newFollow.acct,
        acct_id: newFollow.id,
        followed_at: newFollowTime
      })

      updateBioInfo(userFollow, plaintextNote)
      for (const key of USER_FOLLOW_UPDATE) {
        userFollow[key] = newFollow[key]
      }

      /// console.log('refreshCurationFollows: New user', username, userFollow)
    }

    if (update) {
      setUserFollow(username, userFollow)
      console.log('refreshCurationFollows: Updating user', username, update, newFollow, userFollow)
    }
  }
  store.set({ curationLastFollowRefresh: date2hhmmISO() })
  console.log('refreshCurationFollows: COMPLETED')
}
