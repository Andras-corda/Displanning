import { SlashCommandBuilder } from 'discord.js';
import { addGroupOptions, handleGroupAutocomplete } from '../utils/groupOptions.js';
import { fetchScheduleForCommand, deferFlags } from '../utils/fetchSchedule.js';
import { buildDayEmbed, buildDayGridEmbed, ERROR_MESSAGES } from '../utils/embeds.js';
import { now, eventsOnDay, formatDayLong, isoWeekOffset } from '../utils/dateUtils.js';

function parseDateOption(value) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!m) return null;
  const [, day, month, year] = m;
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  return Number.isNaN(d.getTime()) ? null : d;
}

export const data = addGroupOptions(
  new SlashCommandBuilder()
    .setName('date')
    .setDescription('Show the courses for a specific date')
    .addStringOption((opt) => opt.setName('date').setDescription('DD/MM/YYYY').setRequired(true)),
);

export const autocomplete = handleGroupAutocomplete;

export async function execute(interaction) {
  await interaction.deferReply(deferFlags(interaction));

  const target = parseDateOption(interaction.options.getString('date', true));
  if (!target) {
    await interaction.editReply('❌ Invalid date. Use DD/MM/YYYY, e.g. `21/09/2026`.');
    return;
  }

  const weekOffset = isoWeekOffset(now(), target);
  if (Math.abs(weekOffset) > 1) {
    await interaction.editReply(ERROR_MESSAGES.horsSemaineCourante);
    return;
  }

  const result = await fetchScheduleForCommand(interaction, { weekOffset });
  if (!result) return;

  const events = eventsOnDay(result.events, target);
  const format = interaction.options.getString('format') ?? 'list';
  const build = format === 'grid' ? buildDayGridEmbed : buildDayEmbed;
  const embeds = build({ title: formatDayLong(target), groupeLabel: result.label, events, schedule: result.schedule });
  await interaction.editReply({ embeds });
}
