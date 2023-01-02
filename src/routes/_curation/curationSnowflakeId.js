// Create custom Mastodon snowflake status ID for current (or specified) time

import { hexToDec, decToHex } from '../_thirdparty/hex2dec/hex2dec.js'

export function createSnowflakeId (statusTime, seqNum) {
  // statusTime can be null or anything parseable by Date()
  // sequenceNum must be <= 65535

  // Upto 48 bits from Unix Epoch (milliseconds)
  const bitTim = (new Date(statusTime || Date.now())).getTime().toString(2)

  // 16 bits from sequence number
  let bitSeq = (seqNum || 0).toString(2)

  while (bitSeq.length < 16) bitSeq = '0' + bitSeq

  if (bitSeq.length > 16) bitSeq = bitSeq.substring(bitSeq.length - 16)

  const bitStr = bitTim + bitSeq

  let hexStr = ''

  for (let k = bitStr.length; k > 0; k -= 4) {
    hexStr = parseInt(bitStr.substring(k - 4, k), 2).toString(16) + hexStr
  }

  return hexToDec(hexStr)
}

export function getSnowflakeEpoch (statusId) {
  // Extract Epoch milliseconds from statusId
  if (!statusId || statusId.length < 5) {
    return 0
  }
  const hexStr = decToHex(statusId)
  return parseInt(hexStr.substring(0, hexStr.length - 4), 16)
}

export function getSnowflakeDate (statusId) {
  // Extract date object from statusId
  return new Date(getSnowflakeEpoch(statusId))
}
