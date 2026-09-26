import { SlashCommandBuilder } from 'discord.js';
import { addGroupOptions, handleGroupAutocomplete } from '../utils/groupOptions.js';
import { fetchScheduleForCommand, deferFlags } from '../utils/fetchSchedule.js';
import { buildDayEmbed, buildDayGridEmbed, ERROR_MESSAGES } from '../utils/embeds.js';
import { now, nextSchoolDay, eventsOnDay, formatDayLong, isoWeekOffset } from '../utils/dateUtils.js';

export const data = addGroupOptions(
  new SlashCommandBuilder()
    .setName('tomorrow')
    .setDescription("Show tomorrow's courses"),
);

export const autocomplete = handleGroupAutocomplete;

export async function execute(interaction) {
  await interaction.deferReply(deferFlags(interaction));

  const today = now();
  const target = nextSchoolDay(today);
  const weekOffset = isoWeekOffset(today, target); // 0 la plupart du temps, 1 si aujourd'hui est dimanche

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
