import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List available commands')
  .setIntegrationTypes([ApplicationIntegrationType.UserInstall])
  .setContexts([InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📖 HEAJ Schedule Bot — Commands')
    .setDescription(
      "This bot reads the public HEAJ Espace Invité (no login, no password, ever). " +
        'No preference is stored: every command asks for a program and group.',
    )
    .addFields(
      { name: '/today', value: "Today's courses" },
      { name: '/tomorrow', value: "Tomorrow's courses (Saturday classes are shown when they exist)" },
      { name: '/week', value: 'A week (date: optional — previous, current, or next week only)' },
      { name: '/date date:DD/MM/YYYY', value: 'A specific date (previous, current, or next week only)' },
      { name: '/next', value: 'Your next upcoming course (checks next week too if this week is over)' },
      { name: '/help', value: 'This help' },
      {
        name: 'Every command needs',
        value: '`program` (a dropdown of study programs) and `group` (autocompleted once you pick a program).',
      },
      {
        name: 'Optional: option',
        value:
          'Filter to one sub-track (e.g. `Game Art`) + courses shared by everyone in the group — hides other ' +
          "sub-tracks. Autocompletes from recently-viewed groups, but you can also just type it.",
      },
      {
        name: 'Optional on most commands',
        value: '`public` (show the answer to everyone here instead of just you), `format` (`list` or `grid`), `hide_cancelled`.',
      },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
