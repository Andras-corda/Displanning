import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* Charge dynamiquement tous les modules de src/commands.js */
export async function loadCommands() {
  const commandsDir = join(__dirname, 'commands');
  const files = (await readdir(commandsDir)).filter((f) => f.endsWith('.js'));

  const commands = new Map();
  for (const file of files) {
    const mod = await import(pathToFileURL(join(commandsDir, file)).href);
    if (!mod.data || !mod.execute) {
      console.warn(`[commandLoader] ${file} ignoré: export "data" ou "execute" manquant`);
      continue;
    }
    commands.set(mod.data.name, mod);
  }
  return commands;
}
