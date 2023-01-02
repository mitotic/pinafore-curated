import { store } from '../_store/store.js'
import { HmacHex } from '../_thirdparty/HMAC/HMAC.js'

import { createSnowflakeId, getSnowflakeDate } from '../_curation/curationSnowflakeId.js'

export function curatorAccount (acctName, displayName) {
  const { curationSecretKey } = store.get()
  const username = acctName.toLowerCase() + '@example.com'

  // Generate random 40-bit seconds value (about 35 year period from 1970) using HMAC on username
  const createTime = parseInt('0x' + HmacHex(curationSecretKey, 'curator_' + username).substring(0, 10))
  const createDate = new Date(createTime).toISOString()

  const userId = createSnowflakeId(createTime)
  const account = {
    acct: acctName + '@example.com',
    avatar: '',
    bot: true,
    created_at: createDate,
    discoverable: false,
    display_name: displayName || acctName,
    emojis: [],
    fields: [],
    followers_count: 0,
    following_count: 0,
    group: false,
    header: '',
    header_static: '',
    id: userId,
    last_status_at: createDate.split('T')[0],
    locked: true,
    noindex: true,
    note: '',
    statuses_count: 0,
    url: 'https://example.com/@' + acctName,
    username
  }
  return account
}

export function curatorReblog (status, idStr, acctName, displayName) {
  console.log('curatorReblog:', idStr, acctName, displayName, status)
  const dateStr = getSnowflakeDate(idStr)
  const account = curatorAccount(acctName, displayName)
  return {
    account,
    application: null,
    bookmarked: false,
    card: null,
    content: '',
    created_at: dateStr,
    curation_edition: true,
    edited_at: null,
    emojis: [],
    favourited: false,
    favourites_count: 0,
    filtered: [],
    id: idStr,
    in_reply_to_account_id: null,
    in_reply_to_id: null,
    language: null,
    media_attachments: [],
    mentions: [],
    muted: false,
    poll: null,
    reblog: status,
    reblogged: false,
    reblogs_count: 0,
    replies_count: 0,
    sensitive: false,
    spoiler_text: '',
    tags: [],
    uri: 'https://example.com/users/' + acctName + '/statuses/' + idStr + '/activity',
    url: 'https://example.com/users/' + acctName + '/statuses/' + idStr + '/activity',
    visibility: 'public'
  }
}
