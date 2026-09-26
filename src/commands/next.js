import { SlashCommandBuilder } from 'discord.js';
import { addGroupOptions, handleGroupAutocomplete } from '../utils/groupOptions.js';
import { fetchScheduleForCommand, deferFlags } from '../utils/fetchSchedule.js';
import { buildProchainCoursEmbed } from '../utils/embeds.js';
import { now, formatDelai } from '../utils/dateUtils.js';

export const data = addGroupOptions(
  new SlashCommandBuilder().setName('next').setDescription('Show the next upcoming course'),
  { includeDisplayOptions: false },
);

export const autocomplete = handleGroupAutocomplete;

export async function execute(interaction) {
  await interaction.deferReply(deferFlags(interaction));

  const nowDate = now();

  let result = await fetchScheduleForCommand(interaction, { weekOffset: 0 });
  if (!result) return;
  let next = result.events.find((e) => e.end > nowDate && !e.cancelled);

  // Rien de plus cette semaine : regarde la semaine suivante avant d'abandonner.
  if (!next) {
    const nextWeekResult = await fetchScheduleForCommand(interaction, { weekOffset: 1 });
    if (nextWeekResult) {
      result = nextWeekResult;
      next = result.events.find((e) => !e.cancelled);
    }
  }

  const embed = buildProchainCoursEmbed({
    event: next ?? null,
    groupeLabel: result.label,
    delaiLabel: next ? formatDelai(nowDate, next.start) : null,
    schedule: result.schedule,
  });
  await interaction.editReply({ embeds: [embed] });
}
