import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { loadCommands } from './commandLoader.js';

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('DISCORD_TOKEN et DISCORD_CLIENT_ID sont requis (voir .env.example).');
  process.exit(1);
}

const commands = await loadCommands();
const body = [...commands.values()].map((c) => c.data.toJSON());

const rest = new REST().setToken(DISCORD_TOKEN);

console.log(`Déploiement global de ${body.length} commande(s)...`);
await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body });
console.log('✅ Commandes déployées.');
