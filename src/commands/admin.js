import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { getStats, invalidate, getWeekSchedule, getCachedGroupCodes } from '../services/cache.js';
import { GroupeIntrouvableError } from '../services/scraper.js';
import { getInviteUrl, setInviteUrl, isMaintenanceMode, setMaintenanceMode } from '../services/config.js';
import { ERROR_MESSAGES } from '../utils/embeds.js';

const WEEK_OFFSETS = [-1, 0, 1];

// customId des boutons/modale du panneau admin (préfixés pour les distinguer
// des autres composants si le bot en gagne d'autres un jour).
const BTN_REFRESH_ALL = 'admin_refresh_all';
const BTN_SET_URL = 'admin_set_url';
const BTN_TOGGLE_MAINTENANCE = 'admin_toggle_maintenance';
const MODAL_SET_URL = 'admin_set_url_modal';
const MODAL_SET_URL_INPUT = 'url';

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Bot administrator commands')
  .setIntegrationTypes([ApplicationIntegrationType.UserInstall])
  .setContexts([InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addSubcommand((sub) =>
    sub
      .setName('refresh')
      .setDescription('Force a cache refresh for a group (all 3 available weeks)')
      .addStringOption((opt) => opt.setName('group').setDescription('Group code, e.g. B1J1').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub.setName('refresh-all').setDescription('Force a cache refresh for every group seen so far (all 3 weeks each)'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('set-url')
      .setDescription('Change the base Espace Invité URL (it changes every school year) and clear the cache')
      .addStringOption((opt) => opt.setName('url').setDescription('New https://.../hp/invite URL').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('maintenance')
      .setDescription('Enable/disable maintenance mode (blocks commands for everyone but the admin)')
      .addBooleanOption((opt) => opt.setName('enabled').setDescription('On or off').setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName('status').setDescription("Show the bot's status (with a control panel)"));

function isAdmin(interaction) {
  const adminId = process.env.ADMIN_DISCORD_ID;
  return Boolean(adminId) && interaction.user.id === adminId;
}

function formatUptime(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h${String(min).padStart(2, '0')}`;
  if (h > 0) return `${h}h${String(min).padStart(2, '0')}`;
  return `${min} min`;
}

/*
 * Rafraîchit un groupe sur les 3 semaines disponibles (-1/0/1). Renvoie le
 * nombre de cours de la semaine courante et le nombre d'échecs. Si les 3
 * essais échouent avec la même erreur (ex: code invalide), la relance pour
 * que l'appelant puisse afficher un message adapté plutôt que "0 cours".
 */
async function refreshGroupAllWeeks(code) {
  invalidate(code);
  let currentWeekCount = 0;
  let failures = 0;
  let lastError = null;
  for (const weekOffset of WEEK_OFFSETS) {
    try {
      const schedule = await getWeekSchedule(code, { forceRefresh: true, weekOffset });
      if (weekOffset === 0) currentWeekCount = schedule.events.length;
    } catch (err) {
      failures += 1;
      lastError = err;
    }
  }
  if (failures === WEEK_OFFSETS.length) throw lastError;
  return { currentWeekCount, failures };
}

/* Rafraîchit tous les groupes déjà vus dans le cache. Utilisé par la sous-commande et le bouton du panneau. */
async function refreshAllCachedGroups() {
  const codes = getCachedGroupCodes();
  const results = [];
  for (const code of codes) {
    try {
      const { currentWeekCount, failures } = await refreshGroupAllWeeks(code);
      results.push(`${code}: ${currentWeekCount} courses this week${failures ? ` (${failures} week(s) failed)` : ''}`);
    } catch {
      results.push(`${code}: ❌ failed entirely (group may no longer exist)`);
    }
  }
  return { codes, results };
}

function buildStatusEmbed() {
  const stats = getStats();
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('⚙️ Bot status')
    .addFields(
      { name: 'Espace Invité URL', value: getInviteUrl() },
      { name: 'Maintenance mode', value: isMaintenanceMode() ? '🔧 ON' : '✅ OFF', inline: true },
      { name: 'Uptime', value: formatUptime(stats.uptimeMs), inline: true },
      { name: 'Cached entries', value: String(stats.groupesEnCache), inline: true },
      { name: 'Scrapes run', value: String(stats.totalScrapes), inline: true },
      { name: 'Scrape errors', value: String(stats.totalErrors), inline: true },
      {
        name: 'Last refreshes',
        value:
          stats.derniersRafraichissements.length === 0
            ? 'None'
            : stats.derniersRafraichissements
                .map((r) => `${r.code} — ${r.fetchedAt}`)
                .slice(0, 10)
                .join('\n'),
      },
    );
}

/* Panneau de boutons : refresh-all, changer l'URL (ouvre une modale), bascule maintenance. */
function buildPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(BTN_REFRESH_ALL).setLabel('Refresh all').setStyle(ButtonStyle.Primary).setEmoji('🔄'),
    new ButtonBuilder().setCustomId(BTN_SET_URL).setLabel('Change URL').setStyle(ButtonStyle.Secondary).setEmoji('🔗'),
    new ButtonBuilder()
      .setCustomId(BTN_TOGGLE_MAINTENANCE)
      .setLabel(isMaintenanceMode() ? 'Disable maintenance' : 'Enable maintenance')
      .setStyle(isMaintenanceMode() ? ButtonStyle.Success : ButtonStyle.Danger)
      .setEmoji('🔧'),
  );
}

export async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!isAdmin(interaction)) {
    await interaction.editReply('🔐 This command is reserved to the bot administrator.');
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'status') {
    await interaction.editReply({ embeds: [buildStatusEmbed()], components: [buildPanelRow()] });
    return;
  }

  if (sub === 'maintenance') {
    const enabled = setMaintenanceMode(interaction.options.getBoolean('enabled', true));
    await interaction.editReply(enabled ? '🔧 Maintenance mode enabled.' : '✅ Maintenance mode disabled.');
    return;
  }

  if (sub === 'set-url') {
    const url = interaction.options.getString('url', true).trim();
    if (!/^https:\/\/[^/]+\/hp\/invite\/?$/.test(url)) {
      await interaction.editReply(
        '❌ Expected a URL shaped like `https://<host>/hp/invite` (the "Espace Invité" home page).',
      );
      return;
    }
    setInviteUrl(url);
    invalidate(); // l'ancien cache correspond à l'ancienne instance/année, plus valide
    await interaction.editReply(
      `✅ Espace Invité URL updated to ${url}\nCache cleared — next commands will re-scrape from the new URL.`,
    );
    return;
  }

  if (sub === 'refresh-all') {
    const { codes, results } = await refreshAllCachedGroups();
    if (codes.length === 0) {
      await interaction.editReply("ℹ️ No group has been cached yet — nothing to refresh. Use `/admin refresh` for a specific group.");
      return;
    }
    await interaction.editReply(`✅ Refreshed ${codes.length} group(s):\n${results.join('\n')}`);
    return;
  }

  // sub === 'refresh'
  const code = interaction.options.getString('group', true).trim().toUpperCase();
  try {
    const { currentWeekCount, failures } = await refreshGroupAllWeeks(code);
    await interaction.editReply(
      `✅ Cache refreshed for **${code}** (${currentWeekCount} courses this week)` +
        (failures ? `, but ${failures} of the 3 weeks failed to scrape.` : ', all 3 weeks (-1/0/+1) cached.'),
    );
  } catch (err) {
    if (err instanceof GroupeIntrouvableError) {
      await interaction.editReply(ERROR_MESSAGES.groupeIntrouvable(code));
    } else {
      await interaction.editReply(ERROR_MESSAGES.indisponible);
    }
  }
}

/* Clics sur les boutons du panneau (voir index.js: dispatché sur interaction.isButton()). */
export async function handleButton(interaction) {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '🔐 Reserved to the bot administrator.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.customId === BTN_SET_URL) {
    const modal = new ModalBuilder().setCustomId(MODAL_SET_URL).setTitle('Change Espace Invité URL');
    const input = new TextInputBuilder()
      .setCustomId(MODAL_SET_URL_INPUT)
      .setLabel('New URL (https://.../hp/invite)')
      .setStyle(TextInputStyle.Short)
      .setValue(getInviteUrl())
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  if (interaction.customId === BTN_TOGGLE_MAINTENANCE) {
    const enabled = setMaintenanceMode(!isMaintenanceMode());
    await interaction.update({ embeds: [buildStatusEmbed()], components: [buildPanelRow()] });
    await interaction.followUp({
      content: enabled ? '🔧 Maintenance mode enabled.' : '✅ Maintenance mode disabled.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.customId === BTN_REFRESH_ALL) {
    await interaction.deferUpdate();
    const { codes, results } = await refreshAllCachedGroups();
    await interaction.editReply({ embeds: [buildStatusEmbed()], components: [buildPanelRow()] });
    await interaction.followUp({
      content:
        codes.length === 0
          ? 'ℹ️ No group has been cached yet — nothing to refresh.'
          : `✅ Refreshed ${codes.length} group(s):\n${results.join('\n')}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

/* Soumission de la modale "Change URL" (voir index.js: dispatché sur interaction.isModalSubmit()). */
export async function handleModalSubmit(interaction) {
  if (interaction.customId !== MODAL_SET_URL) return;

  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '🔐 Reserved to the bot administrator.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const url = interaction.fields.getTextInputValue(MODAL_SET_URL_INPUT).trim();
  if (!/^https:\/\/[^/]+\/hp\/invite\/?$/.test(url)) {
    await interaction.editReply('❌ Expected a URL shaped like `https://<host>/hp/invite`.');
    return;
  }
  setInviteUrl(url);
  invalidate();
  await interaction.editReply(`✅ Espace Invité URL updated to ${url}\nCache cleared.`);
}

export function isAdminComponent(customId) {
  return [BTN_REFRESH_ALL, BTN_SET_URL, BTN_TOGGLE_MAINTENANCE].includes(customId);
}

export function isAdminModal(customId) {
  return customId === MODAL_SET_URL;
}
