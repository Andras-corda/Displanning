import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/*
 * Config admin persistée (PAS des données utilisateur — un seul réglage
 * global : l'URL de l'Espace Invité, qui change de nom chaque année
 * scolaire, ex: heaj2627 -> heaj2728). Modifiable via /admin set-url.
 * Fichier gitignoré (spécifique à chaque déploiement/année).
 */
const DEFAULT_INVITE_URL = 'https://heaj2627.hyperplanning.fr/hp/invite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', '..', 'data', 'config.json');

let cached = null;

function load() {
  if (cached) return cached;
  try {
    cached = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    cached = {};
  }
  return cached;
}

function persist() {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cached, null, 2), 'utf-8');
}

/* URL de l'Espace Invité : config persistée > variable d'env HEAJ_INVITE_URL > valeur par défaut codée en dur. */
export function getInviteUrl() {
  const cfg = load();
  return cfg.inviteUrl || process.env.HEAJ_INVITE_URL || DEFAULT_INVITE_URL;
}

/* Change l'URL de l'Espace Invité (persisté sur disque, survit aux redémarrages). */
export function setInviteUrl(url) {
  const cfg = load();
  cfg.inviteUrl = url;
  persist();
}

/* Mode maintenance : bloque les commandes pour tout le monde sauf l'admin. Persisté (survit aux redémarrages). */
export function isMaintenanceMode() {
  return Boolean(load().maintenanceMode);
}

export function setMaintenanceMode(enabled) {
  const cfg = load();
  cfg.maintenanceMode = Boolean(enabled);
  persist();
  return cfg.maintenanceMode;
}

export function configFileExists() {
  return existsSync(CONFIG_PATH);
}
