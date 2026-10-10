// URL switches: ?lite (half the content, no shadows), ?fresh (forget the saved planet), ?screen=world (skip the intro),
// ?globe=paper|toy (which planet to open; the landing screen can switch it too)
const q = new URLSearchParams(location.search)
export const LITE = q.has('lite')
export const FRESH = q.has('fresh')
export const START_SCREEN = q.get('screen')
export const DEBUG = q.has('debug')
export const GLOBE_PARAM = q.get('globe')
