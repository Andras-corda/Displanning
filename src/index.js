import 'dotenv/config';
import { Client, GatewayIntentBits, MessageFlags } from 'discord.js';
import { loadCommands } from './commandLoader.js';
import { closeBrowser } from './services/scraper.js';
import { isMaintenanceMode } from './services/config.js';
import { isAdminComponent, isAdminModal, handleButton, handleModalSubmit } from './commands/admin.js';

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN manquant (voir .env.example).');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = await loadCommands();
console.log(`[index] ${commands.size} commande(s) chargée(s): ${[...commands.keys()].join(', ')}`);

client.once('clientReady', (c) => {
  console.log(`✅ Connecté en tant que ${c.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);
    if (!command?.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (err) {
      console.error(`[index] Erreur d'autocomplétion dans /${interaction.commandName}:`, err);
      await interaction.respond([]).catch(() => {});
    }
    return;
  }

  if (interaction.isButton() && isAdminComponent(interaction.customId)) {
    try {
      await handleButton(interaction);
    } catch (err) {
      console.error('[index] Erreur dans un bouton admin:', err);
    }
    return;
  }

  if (interaction.isModalSubmit() && isAdminModal(interaction.customId)) {
    try {
      await handleModalSubmit(interaction);
    } catch (err) {
      console.error('[index] Erreur dans une modale admin:', err);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.warn(`[index] Commande inconnue reçue: ${interaction.commandName}`);
    return;
  }

  // Mode maintenance : bloque tout sauf /admin (pour que l'admin puisse le désactiver) et l'admin lui-même.
  const adminId = process.env.ADMIN_DISCORD_ID;
  if (isMaintenanceMode() && command.data.name !== 'admin' && interaction.user.id !== adminId) {
    await interaction.reply({
      content: '🔧 The bot is currently under maintenance. Please try again later.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[index] Erreur dans /${interaction.commandName}:`, err);
    const payload = { content: '❌ Une erreur inattendue est survenue.', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

async function shutdown(signal) {
  console.log(`[index] Arrêt (${signal})...`);
  await closeBrowser().catch(() => {});
  client.destroy();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

client.login(DISCORD_TOKEN);
