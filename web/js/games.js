/* The hidden games behind the logo. Each is loaded only when opened. The logo opens the "game of the day":
   the same for everyone on a given day (Oslo date), picked from the ready games – add a game to READY and it joins
   the rotation. Games not in READY can still be opened directly (#/game/<id>) for testing. */

export const GAMES = {
  forsinket: () => import('./game.js'),
  sporarbeid: () => import('./game-spor.js'),
  fullfart: () => import('./game-fart.js'),   /* not ready yet: not in the rotation */
};
const READY = ['forsinket', 'sporarbeid'];

const osloDate = d => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(d);   /* YYYY-MM-DD */

/** Today's game id: a small hash of the date, so the order looks random but is the same for everyone. */
export function gameOfDay(date = new Date()) {
  let h = 2166136261;
  for (const ch of osloDate(date)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return READY[(h >>> 0) % READY.length];
}
