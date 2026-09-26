import { SlashCommandBuilder } from 'discord.js';
import { addGroupOptions, handleGroupAutocomplete } from '../utils/groupOptions.js';
import { fetchScheduleForCommand, deferFlags } from '../utils/fetchSchedule.js';
import { buildDayEmbed, buildDayGridEmbed } from '../utils/embeds.js';
import { now, eventsOnDay, formatDayLong } from '../utils/dateUtils.js';

export const data = addGroupOptions(
  new SlashCommandBuilder().setName('today').setDescription("Show today's courses"),
);

export const autocomplete = handleGroupAutocomplete;

export async function execute(interaction) {
  await interaction.deferReply(deferFlags(interaction));

  const result = await fetchScheduleForCommand(interaction);
  if (!result) return;

  const today = now();
  const events = eventsOnDay(result.events, today);
  const format = interaction.options.getString('format') ?? 'list';
  const build = format === 'grid' ? buildDayGridEmbed : buildDayEmbed;
  const embeds = build({ title: formatDayLong(today), groupeLabel: result.label, events, schedule: result.schedule });
  await interaction.editReply({ embeds });
}
