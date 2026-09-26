import { EmbedBuilder } from 'discord.js';
import { formatDayLong, formatTime } from './dateUtils.js';
import { findLocalUrl } from '../data/locaux.js';

const COLOR = 0x5865f2;
const MAX_FIELDS = 25;
const MAX_EMBED_CHARS = 6000;

/* Transforme un nom de salle en lien cliquable vers sa carte interactive quand on la reconnaît (voir locaux.js). */
function linkifyRoom(room) {
  return room
    .split(' / ')
    .map((part) => {
      const url = findLocalUrl(part);
      return url ? `[${part}](${url})` : part;
    })
    .join(' / ');
}

function footerFor(schedule) {
  return { text: `Dernière mise à jour : ${formatTime(schedule.scrapedAt)} le ${formatDayLong(schedule.scrapedAt)}` };
}

function eventField(ev) {
  const range = `${formatTime(ev.start)} → ${formatTime(ev.end)}`;
  const name = ev.cancelled ? `❌ ${range}` : `🕘 ${range}`;
  const lines = [ev.cancelled ? `~~${ev.subject}~~ (annulé)` : ev.subject];
  if (ev.subgroup) lines.push(`🏷️ ${ev.subgroup}`);
  if (ev.room) lines.push(`📍 ${linkifyRoom(ev.room)}`);
  if (ev.teacher) lines.push(`👤 ${ev.teacher}`);
  if (ev.distanciel) lines.push('💻 Distanciel');
  return { name, value: lines.join('\n') };
}

// Format "liste détaillée"
/* Embed pour un seul jour */
export function buildDayEmbed({ title, groupeLabel, events, schedule }) {
  const embed = new EmbedBuilder().setColor(COLOR).setTitle(`📅 ${title} — ${groupeLabel}`).setFooter(footerFor(schedule));
  if (events.length === 0) {
    embed.setDescription('🎉 Aucun cours prévu !');
    return [embed];
  }
  for (const ev of events) embed.addFields(eventField(ev));
  return [embed];
}

/* Embed(s) pour une semaine, groupés par jour. Répartit sur plusieurs embeds si la limite de 25 champs ou 6000 caractères est dépassée */
export function buildWeekEmbeds({ weekLabel, groupeLabel, eventsByDay, schedule }) {
  const embeds = [];
  let current = new EmbedBuilder().setColor(COLOR).setTitle(`📅 Semaine ${weekLabel} — ${groupeLabel}`);
  let fieldCount = 0;
  let charCount = 0;

  const pushField = (field) => {
    const fieldLen = field.name.length + field.value.length;
    if (fieldCount >= MAX_FIELDS || charCount + fieldLen > MAX_EMBED_CHARS) {
      embeds.push(current);
      current = new EmbedBuilder().setColor(COLOR).setTitle(`📅 Semaine ${weekLabel} — ${groupeLabel} (suite)`);
      fieldCount = 0;
      charCount = 0;
    }
    current.addFields(field);
    fieldCount += 1;
    charCount += fieldLen;
  };

  let any = false;
  for (const [day, events] of eventsByDay) {
    if (events.length === 0) continue;
    any = true;
    pushField({ name: `​`, value: `**📆 ${formatDayLong(day)}**` });
    for (const ev of events) pushField(eventField(ev));
  }

  if (!any) current.setDescription('🎉 Aucun cours prévu cette semaine !');
  current.setFooter(footerFor(schedule));
  embeds.push(current);
  return embeds;
}

export function buildProchainCoursEmbed({ event, groupeLabel, delaiLabel, schedule }) {
  const embed = new EmbedBuilder().setColor(COLOR).setTitle(`📅 Prochain cours — ${groupeLabel}`).setFooter(footerFor(schedule));
  if (!event) {
    embed.setDescription('🎉 Aucun cours à venir dans la semaine affichée !');
    return embed;
  }
  const lines = [
    `**${event.subject}**`,
    `🕘 ${formatDayLong(event.start)}, ${formatTime(event.start)} → ${formatTime(event.end)} (${delaiLabel})`,
  ];
  if (event.room) lines.push(`📍 ${linkifyRoom(event.room)}`);
  if (event.teacher) lines.push(`👤 ${event.teacher}`);
  if (event.distanciel) lines.push('💻 Distanciel');
  embed.setDescription(lines.join('\n'));
  return embed;
}

// Format "tableau compact"

function truncate(s, max) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function gridRow(ev) {
  const time = `${formatTime(ev.start)}-${formatTime(ev.end)}`.padEnd(13);
  const subject = truncate(ev.cancelled ? `${ev.subject} (annulé)` : ev.subject, 30).padEnd(31);
  const room = truncate(ev.room ?? '', 14);
  const marker = ev.cancelled ? '✗ ' : '  ';
  return `${marker}${time}${subject}${room}`;
}

function gridBlock(events) {
  if (events.length === 0) return '(aucun cours)';
  const header = `  ${'Horaire'.padEnd(13)}${'Matière'.padEnd(31)}Salle`;
  return ['```', header, '-'.repeat(header.length), ...events.map(gridRow), '```'].join('\n');
}

/* Variante "tableau compact" de buildDayEmbed */
export function buildDayGridEmbed({ title, groupeLabel, events, schedule }) {
  const embed = new EmbedBuilder().setColor(COLOR).setTitle(`📅 ${title} — ${groupeLabel}`).setFooter(footerFor(schedule));
  embed.setDescription(events.length === 0 ? '🎉 Aucun cours prévu !' : gridBlock(events));
  return [embed];
}

/* Variante "tableau compact" de buildWeekEmbeds (un champ par jour, table dans chaque valeur) */
export function buildWeekGridEmbeds({ weekLabel, groupeLabel, eventsByDay, schedule }) {
  const embed = new EmbedBuilder().setColor(COLOR).setTitle(`📅 Semaine ${weekLabel} — ${groupeLabel}`).setFooter(footerFor(schedule));
  let any = false;
  for (const [day, events] of eventsByDay) {
    if (events.length === 0) continue;
    any = true;
    embed.addFields({ name: `📆 ${formatDayLong(day)}`, value: gridBlock(events) });
  }
  if (!any) embed.setDescription('🎉 Aucun cours prévu cette semaine !');
  return [embed]; // un tableau tient généralement en un seul embed ; fractionnement non géré pour ce format
}

export const ERROR_MESSAGES = {
  indisponible: '⚠️ HYPERPLANNING est actuellement indisponible.\nRéessayez dans quelques minutes.',
  groupeIntrouvable: (code) => `❌ Groupe \`${code}\` introuvable en espace invité. Vérifiez le code (ex: \`B1J1\`).`,
  horsSemaineCourante: "⚠️ Cette date sort de la plage disponible (semaine précédente, courante, ou suivante uniquement — limitation connue, voir SPECIFICATION.md).",
};
