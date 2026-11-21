/* The hidden games behind the logo. Each is loaded only when opened. The logo opens the "game of the day":
   the same for everyone on a given day (Oslo date), picked from the list – add a game here and it joins the rotation. */

export const GAMES = {
  forsinket: () => import('./game.js'),
  sporarbeid: () => import('./game-spor.js'),
  fullfart: () => import('./game-fart.js'),
};

const osloDate = d => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(d);   /* YYYY-MM-DD */

/** Today's game id: a small hash of the date, so the order looks random but is the same for everyone. */
export function gameOfDay(date = new Date()) {
  const ids = Object.keys(GAMES);
  let h = 2166136261;
  for (const ch of osloDate(date)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ids[(h >>> 0) % ids.length];
}

/** The game after `id` in the list (for "try the other game"). */
export const nextGame = id => { const ids = Object.keys(GAMES); return ids[(ids.indexOf(id) + 1) % ids.length]; };
