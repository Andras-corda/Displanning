const TZ = 'Europe/Brussels';

/* Date/heure actuelle */
export function now() {
  return new Date();
}

/* Jour de la semaine (0=dimanche..6=samedi) de `date` */
export function weekdayInBrussels(date) {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(date);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[s];
}

/* Ajoute `days` jours calendaires */
export function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function nextSchoolDay(date) {
  return addDays(date, 1);
}

/* Numéro de semaine */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/* true si `a` et `b` tombent dans la même semaine */
export function isSameIsoWeek(a, b) {
  return isoWeek(a) === isoWeek(b) && a.getUTCFullYear() === b.getUTCFullYear();
}

/* Décalage de semaine ISO entre `from` et `to` (-1/0/1 seuls fiables, voir scraper.js:selectWeekOffset) */
export function isoWeekOffset(from, to) {
  return isoWeek(to) - isoWeek(from);
}

/* true si `a` et `b` tombent le même jour */
export function isSameDay(a, b) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(a) === fmt.format(b);
}

/* Filtre les événements dont le créneau touche l'intervalle [from, to] */
export function eventsOnDay(events, day) {
  return events.filter((e) => isSameDay(e.start, day));
}

const DAY_FORMAT = new Intl.DateTimeFormat('fr-BE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const TIME_FORMAT = new Intl.DateTimeFormat('fr-BE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDayLong(date) {
  return capitalize(DAY_FORMAT.format(date));
}

export function formatTime(date) {
  return TIME_FORMAT.format(date);
}

/* Délai restant lisible avant `date`, ex: "dans 2h15", "dans 15 min" */
export function formatDelai(fromDate, toDate) {
  const ms = toDate.getTime() - fromDate.getTime();
  if (ms <= 0) return 'en cours';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `dans ${min} min`;
  if (min === 0) return `dans ${h}h`;
  return `dans ${h}h${String(min).padStart(2, '0')}`;
}
