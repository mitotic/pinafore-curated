import { store } from '../store.js'
import { scheduleIdleTask } from '../../_utils/scheduleIdleTask.js'
import { scheduleInterval } from '../../_utils/scheduleInterval.js'

import { MAHOOT_CODE_VERSION, MAHOOT_DATA_VERSION, UPDATE_INTERVAL_MINUTES, USER_TIMEZONE_KEY, getSelfUser } from '../../_curation/curationGeneral.js'

import { updateStatusBuffer } from '../../_curation/curationBuffer.js'

import { } from '../../_curation/curationTest.js'

console.log('curationObserversINIT', MAHOOT_CODE_VERSION, MAHOOT_DATA_VERSION, UPDATE_INTERVAL_MINUTES)

let InitiatedBufferUpdating = false

export function curationObservers () {
  console.log('curationObservers***********')
  const { curationDataVersion } = store.get()

  if (curationDataVersion && curationDataVersion !== MAHOOT_DATA_VERSION) {
    console.log('curationObservers: POSSIBLE DATA VERSION MISMATCH - old, current', curationDataVersion, MAHOOT_DATA_VERSION)
  }

  store.observe('verifyCredentials', async (verifyCredentials) => {
    if (!process.browser) {
      return
    }

    const { currentInstance, curationTimezone } = store.get()

    if (!currentInstance || !verifyCredentials || !verifyCredentials[currentInstance]) {
      return
    }

    const selfUser = getSelfUser()
    const timezone = selfUser[USER_TIMEZONE_KEY]

    console.log('curationObservers: instance, username, timezone, credentials', currentInstance, selfUser.username, timezone, selfUser)

    if (curationTimezone !== timezone) {
      store.set({ curationTimezone: timezone })
    }

    if (!InitiatedBufferUpdating) {
      InitiatedBufferUpdating = true
      scheduleIdleTask(() => updateStatusBuffer('init'))
      scheduleInterval(updateStatusBuffer, (1 + UPDATE_INTERVAL_MINUTES) * 60 * 1000, true)
    }
  })
}
