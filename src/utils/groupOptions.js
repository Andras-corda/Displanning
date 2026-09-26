import { ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { FILIERES, findGroupByCode } from '../data/filieres.js';
import { peekCached, getWeekSchedule } from '../services/cache.js';

function warmCache(code) {
  if (!code) return;
  getWeekSchedule(code).catch(() => {});
}

/*
 * Ajoute les options communes à toutes les commandes de consultation :
 * filière (menu déroulant fixe), groupe (autocomplétion locale filtrée par
 * la filière choisie —> aucune requête au serveur HEAJ */
export function addGroupOptions(builder, { includeDisplayOptions = true } = {}) {
  builder
    .addStringOption((opt) =>
      opt
        .setName('program')
        .setDescription('Study program / filière')
        .setRequired(true)
        .addChoices(...FILIERES.map((f) => ({ name: f.label, value: f.id }))),
    )
    .addStringOption((opt) =>
      opt
        .setName('group')
        .setDescription('Class group within the chosen program')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((opt) =>
      opt
        .setName('option')
        .setDescription('Only show this sub-option/track (e.g. "Game Art") + courses shared by everyone')
        .setAutocomplete(true),
    )
    .addBooleanOption((opt) =>
      opt.setName('public').setDescription('Show the response to everyone here (default: only you)'),
    );

  if (includeDisplayOptions) {
    builder
      .addStringOption((opt) =>
        opt
          .setName('format')
          .setDescription('Display format (default: detailed list)')
          .addChoices({ name: 'Detailed list', value: 'list' }, { name: 'Compact table', value: 'grid' }),
      )
      .addBooleanOption((opt) =>
        opt.setName('hide_cancelled').setDescription('Hide cancelled courses'),
      );
  }

  return builder
    .setIntegrationTypes([ApplicationIntegrationType.UserInstall])
    .setContexts([InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);
}

/*
 * Gère l'autocomplétion des options `group` et `option`.
 * - `group` : filtre le catalogue local (src/data/filieres.js) par la
 *   filière déjà choisie — aucune requête au serveur HEAJ.
 * - `option` : best-effort, lit les sous-groupes déjà VUS dans le cache
 *   pour ce groupe (`peekCached`, jamais de scraping déclenché ici — le
 *   cache est probablement encore froid la première fois qu'on choisit un
 *   groupe, puisque le scraping n'a lieu qu'à l'exécution de la commande ;
 *   ça reste une saisie libre qui fonctionne même sans suggestion).
 */
export async function handleGroupAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);

  if (focused.name === 'option') {
    const code = interaction.options.getString('group')?.trim().toUpperCase();
    const cached = code ? peekCached(code) : null;
    if (code && !cached) warmCache(code); // pas prêt pour cette frappe-ci, mais utile pour la suivante/la prochaine fois
    const subgroups = [...new Set((cached?.events ?? []).map((e) => e.subgroup).filter(Boolean))];
    const query = focused.value.trim().toLowerCase();
    const matches = subgroups
      .filter((s) => !query || s.toLowerCase().includes(query))
      .slice(0, 25)
      .map((s) => ({ name: s, value: s }));
    await interaction.respond(matches);
    return;
  }

  if (focused.name !== 'group') {
    await interaction.respond([]);
    return;
  }

  const filiereId = interaction.options.getString('program');
  const filiere = FILIERES.find((f) => f.id === filiereId);
  const pool = filiere ? filiere.groups : FILIERES.flatMap((f) => f.groups);

  const query = focused.value.trim().toLowerCase();
  const matches = pool
    .filter((g) => !query || g.code.toLowerCase().includes(query) || g.label.toLowerCase().includes(query))
    .slice(0, 25)
    .map((g) => ({ name: g.label, value: g.code }));

  // Préchauffe le cache dès qu'une seule classe correspond encore à la
  // saisie : l'utilisateur est sur le point de la choisir la plupart du
  // temps, et ça laisse un peu de temps au scraping avant l'étape `option`.
  if (matches.length === 1) warmCache(matches[0].value);

  await interaction.respond(matches);
}

/* Résout le paramètre `group` (code) vers ses infos catalogue (pour affichage). */
export function resolveGroupOption(interaction) {
  const code = interaction.options.getString('group', true).trim().toUpperCase();
  const known = findGroupByCode(code);
  return { code, label: known?.label ? `${code} — ${known.filiereLabel}` : code };
}
