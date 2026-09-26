import { MessageFlags } from 'discord.js';
import { getWeekSchedule } from '../services/cache.js';
import { GroupeIntrouvableError } from '../services/scraper.js';
import { ERROR_MESSAGES } from './embeds.js';
import { resolveGroupOption } from './groupOptions.js';

/**
 * Récupère l'horaire du groupe choisi (aucune préférence mémorisée — le
 * groupe est toujours fourni explicitement via les options `program`/
 * `group`, voir SPECIFICATION.md). `weekOffset` : -1/0/1 uniquement (semaine
 * précédente/courante/suivante — voir SPECIFICATION.md pour pourquoi rien
 * d'autre n'est fiable). Applique les filtres d'affichage optionnels
 * (hide_cancelled, option). Répond directement à l'interaction et retourne
 * `null` en cas d'erreur gérée ; retourne `{ code, label, schedule, events }`
 * sinon.
 */
export async function fetchScheduleForCommand(interaction, { weekOffset = 0 } = {}) {
  const { code, label } = resolveGroupOption(interaction);

  let schedule;
  try {
    schedule = await getWeekSchedule(code, { weekOffset });
  } catch (err) {
    if (err instanceof GroupeIntrouvableError) {
      await interaction.editReply(ERROR_MESSAGES.groupeIntrouvable(code));
    } else {
      await interaction.editReply(ERROR_MESSAGES.indisponible);
    }
    return null;
  }

  const hideCancelled = interaction.options.getBoolean('hide_cancelled') ?? false;
  const option = interaction.options.getString('option')?.trim().toLowerCase();

  let events = schedule.events;
  if (hideCancelled) events = events.filter((e) => !e.cancelled);
  // Garde les cours communs à tout le groupe (sans sous-groupe) + ceux de
  // l'option choisie ; masque les autres sous-groupes/options.
  if (option) events = events.filter((e) => !e.subgroup || e.subgroup.toLowerCase().includes(option));

  return { code, label, schedule, events };
}

/** Éphémère par défaut, visible de tous si l'option `public` est activée. */
export function deferFlags(interaction) {
  const isPublic = interaction.options.getBoolean('public') ?? false;
  return isPublic ? undefined : { flags: MessageFlags.Ephemeral };
}
