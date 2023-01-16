import { post, WRITE_TIMEOUT } from '../_utils/ajax.js'
import { auth, basename } from './utils.js'

export async function followAccount (instanceName, accessToken, accountId) {
  const url = `${basename(instanceName)}/api/v1/accounts/${accountId}/follow`
  return post(url, null, auth(accessToken), { timeout: WRITE_TIMEOUT })
}

export async function unfollowAccount (instanceName, accessToken, accountId) {
  const url = `${basename(instanceName)}/api/v1/accounts/${accountId}/unfollow`
  return post(url, null, auth(accessToken), { timeout: WRITE_TIMEOUT })
}

export async function followTag (instanceName, accessToken, tagName) {
  const url = `${basename(instanceName)}/api/v1/tags/${tagName}/follow`
  return post(url, null, auth(accessToken), { timeout: WRITE_TIMEOUT })
}

export async function unfollowTag (instanceName, accessToken, tagName) {
  const url = `${basename(instanceName)}/api/v1/tags/${tagName}/unfollow`
  return post(url, null, auth(accessToken), { timeout: WRITE_TIMEOUT })
}
