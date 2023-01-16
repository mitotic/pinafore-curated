import { observers } from './observers/observers.js'
import { computations } from './computations/computations.js'
import { mixins } from './mixins/mixins.js'
import { LocalStorageStore } from './LocalStorageStore.js'
import { observe } from 'svelte-extras'
import { isKaiOS } from '../_utils/userAgent/isKaiOS.js'

const persistedState = {
  alwaysShowFocusRing: false,
  autoplayGifs: false,
  composeData: {},
  currentInstance: null,
  currentRegisteredInstanceName: undefined,
  currentRegisteredInstance: undefined,
  // we disable scrollbars by default on iOS
  disableCustomScrollbars: process.browser && /iP(?:hone|ad|od)/.test(navigator.userAgent),
  bottomNav: false,
  centerNav: false,
  disableFavCounts: false,
  disableFollowerCounts: false,
  disableHotkeys: false,
  disableInfiniteScroll: false,
  disableLongAriaLabels: false,
  disableNotificationBadge: false,
  disableReblogCounts: false,
  disableRelativeTimestamps: false,
  disableTapOnStatus: false,
  enableGrayscale: false,
  hideCards: false,
  largeInlineMedia: false,
  leftRightChangesFocus: isKaiOS(),
  instanceNameInSearch: '',
  instanceThemes: {},
  instanceSettings: {},
  loggedInInstances: {},
  loggedInInstancesInOrder: [],
  markMediaAsSensitive: false,
  neverMarkMediaAsSensitive: false,
  ignoreBlurhash: false,
  omitEmojiInDisplayNames: undefined,
  pinnedPages: {},
  pushSubscriptions: {},
  reduceMotion:
    !process.browser ||
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  underlineLinks: false,
  curationViewsPerDay: 300,
  curationDaysOfData: 30,
  curationEditionTime: '', // hh:mm value (local time) TODO: up to 4 editions per day
  curationEditionLayout: '',
  curationSecretKey: 'default', // Low-grade secret key (used to generate HMAC-based random numbers to filter posts)
  curationTagsFollowed: [],
  curationTagsAmpFactor: 1,
  curationDisabled: false,
  curationShowTime: false,
  curationShowAllStatus: false,
  curationShowReplyContext: false,
  curationAmplifyHighBoosts: false,
  curationHideDuplicateBoosts: false,
  curationHideSelfReplies: false,
  curationAnonymize: false,
  curationDevMode: false,
  curationDevFetchStatus: true,
  curationDevMessageHook: true,
  curationDataVersion: '',
  curationTimezone: '', // Continent/City (TODO)
  curationLastMotxDates: {}, // {motd_date, motw_day, motm_month}
  curationLastSaveInterval: '', // Start time (yyyy-mm-ddThh:mmZ) for start of last status summary save interval
  curationLastFollowRefresh: '' // Time (yyyy-mm-ddThh:mmZ) of last user follow/hashtag follow refresh
}

export const CURATION_SETTINGS = ['curationViewsPerDay', 'curationDaysOfData', 'curationEditionTime', 'curationEditionLayout', 'curationSecretKey', 'curationDisabled', 'curationLastMotxDates', 'curationLastSaveInterval', 'curationLastFollowRefresh'].reduce((obj, key) => ({ ...obj, [key]: persistedState[key] }), {})

const nonPersistedState = {
  customEmoji: {},
  unexpiredInstanceFilters: {},
  followRequestCounts: {},
  instanceInfos: {},
  instanceLists: {},
  instanceFilters: {},
  online: !process.browser || navigator.onLine,
  pinnedStatuses: {},
  polls: {},
  pushNotificationsSupport:
    process.browser &&
    ('serviceWorker' in navigator &&
      'PushManager' in window &&
      'getKey' in window.PushSubscription.prototype),
  queryInSearch: '',
  repliesShown: {},
  sensitivesShown: {},
  spoilersShown: {},
  statusModifications: {},
  verifyCredentials: {},
  curationFilterTime: '',
  curationPostsPerDay: '*',
  curationEditionStats: '',
  curationUpdatingRecent: '',
  curationUpdatingBuffer: '',
  curationUpdatingMessage: ''
}

const state = Object.assign({}, persistedState, nonPersistedState)
const keysToStoreInLocalStorage = new Set(Object.keys(persistedState))

export class PinaforeStore extends LocalStorageStore {
  constructor (state) {
    super(state, keysToStoreInLocalStorage)
  }
}

PinaforeStore.prototype.observe = observe

export const store = new PinaforeStore(state)

mixins(PinaforeStore)
computations(store)
observers(store)

if (process.browser) {
  window.__store = store // for debugging
}
