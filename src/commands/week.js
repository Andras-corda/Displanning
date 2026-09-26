import { SlashCommandBuilder } from 'discord.js';
import { addGroupOptions, handleGroupAutocomplete } from '../utils/groupOptions.js';
import { fetchScheduleForCommand, deferFlags } from '../utils/fetchSchedule.js';
import { buildWeekEmbeds, buildWeekGridEmbeds, ERROR_MESSAGES } from '../utils/embeds.js';
import { now, addDays, eventsOnDay, isoWeekOffset, weekdayInBrussels } from '../utils/dateUtils.js';

function parseDateOption(value) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!m) return null;
  const [, day, month, year] = m;
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  return Number.isNaN(d.getTime()) ? null : d;
}

export const data = addGroupOptions(
  new SlashCommandBuilder().setName('week').setDescription("Show this week's courses"),
).addStringOption((opt) =>
  opt.setName('date').setDescription('A date within the target week, DD/MM/YYYY (default: current week)'),
);

export const autocomplete = handleGroupAutocomplete;

export async function execute(interaction) {
  await interaction.deferReply(deferFlags(interaction));

  const dateOpt = interaction.options.getString('date');
  const today = now();
  let refDate = today;
  if (dateOpt) {
    refDate = parseDateOption(dateOpt);
    if (!refDate) {
      await interaction.editReply('❌ Invalid date. Use DD/MM/YYYY, e.g. `21/09/2026`.');
      return;
    }
  }

  const weekOffset = isoWeekOffset(today, refDate);
  if (Math.abs(weekOffset) > 1) {
    await interaction.editReply(ERROR_MESSAGES.horsSemaineCourante);
    return;
  }

  const result = await fetchScheduleForCommand(interaction, { weekOffset });
  if (!result) return;

  const wd = weekdayInBrussels(refDate); // 0=dimanche..6=samedi
  const mondayOffset = wd === 0 ? -6 : 1 - wd;
  const monday = addDays(refDate, mondayOffset);

  const eventsByDay = [];
  for (let i = 0; i < 6; i++) {
    const day = addDays(monday, i);
    eventsByDay.push([day, eventsOnDay(result.events, day)]);
  }

  const weekLabel = `du ${new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'long' }).format(monday)}`;
  const format = interaction.options.getString('format') ?? 'list';
  const build = format === 'grid' ? buildWeekGridEmbeds : buildWeekEmbeds;
  const embeds = build({ weekLabel, groupeLabel: result.label, eventsByDay, schedule: result.schedule });
  await interaction.editReply({ embeds });
}
