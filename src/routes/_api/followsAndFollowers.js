import { getWithHeaders, paramsString, DEFAULT_TIMEOUT } from '../_utils/ajax.js'
import { auth, basename } from './utils.js'
import { statusHtmlToPlainText } from '../_utils/statusHtmlToPlainText.js'
import li from 'li'

// Cap number of follows/follower displayed to avoid overload
const MAX_FOLLOW_ITEMS = 2000

async function fetchPagedAccounts (url, accessToken, plainTextNotes) {
  console.log('fetching paged url', url)

  let { json: items, headers } = await getWithHeaders(url, auth(accessToken), { timeout: DEFAULT_TIMEOUT })
  const linkHeader = headers.get('Link')
  const parsedLinkHeader = li.parse(linkHeader)
  const nextUrl = parsedLinkHeader && parsedLinkHeader.next

  if (nextUrl && items.length < MAX_FOLLOW_ITEMS) {
    const result = await Promise.all([
      fetchPagedAccounts(nextUrl, accessToken, plainTextNotes),
      note2PlainText(items, plainTextNotes)
    ])

    items = items.concat(result[0])
  } else {
    await note2PlainText(items, plainTextNotes)
  }

  return items
}

export async function getFollows (instanceName, accessToken, accountId, limit = 80) {
  let url = `${basename(instanceName)}/api/v1/accounts/${accountId}/following`
  url += '?' + paramsString({ limit })
  return fetchPagedAccounts(url, accessToken, true)
}

export async function getFollowers (instanceName, accessToken, accountId, limit = 80) {
  let url = `${basename(instanceName)}/api/v1/accounts/${accountId}/followers`
  url += '?' + paramsString({ limit })
  return fetchPagedAccounts(url, accessToken, false)
}

async function note2PlainText (items, convert) {
  if (!convert) {
    return false
  }
  // Compute the plain text version of note (bio) for each account
  for (const item of items) {
    item.plaintext_note = statusHtmlToPlainText(item.note, [])
  }
  return true
}
