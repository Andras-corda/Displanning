import { getCurrentWeekSchedule } from './scraper.js';

const TTL_MS = (Number(process.env.CACHE_TTL_MINUTES) || 10) * 60 * 1000;

/**
 * Cache partagé par (code de groupe, décalage de semaine) — pas par
 * utilisateur : plusieurs étudiant·e·s du même groupe déclenchent une
 * seule requête de scraping, ce qui limite la charge sur le serveur HEAJ
 * (§ objectif 4 du cahier des charges). Map<"code#offset", { data, fetchedAt }>
 */
const cache = new Map();
let totalErrors = 0;
let totalScrapes = 0;
const startedAt = new Date();

function cacheKey(code, weekOffset) {
  return `${code}#${weekOffset}`;
}

/**
 * Récupère l'horaire d'une semaine pour un groupe, via le cache si frais.
 * `weekOffset` : -1 (précédente), 0 (courante, défaut), 1 (suivante) — voir
 * `selectWeekOffset` dans scraper.js pour pourquoi rien d'autre n'est
 * fiable.
 */
export async function getWeekSchedule(code, { forceRefresh = false, weekOffset = 0 } = {}) {
  const key = cacheKey(code, weekOffset);
  const entry = cache.get(key);
  const isFresh = entry && Date.now() - entry.fetchedAt < TTL_MS;
  if (isFresh && !forceRefresh) return entry.data;

  totalScrapes += 1;
  try {
    const data = await getCurrentWeekSchedule(code, { weekOffset });
    cache.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    totalErrors += 1;
    if (entry) return entry.data; // données périmées plutôt qu'une erreur
    throw err;
  }
}

/**
 * Lit le cache d'un groupe (semaine courante par défaut) SANS jamais
 * déclencher de scraping. Utilisé par l'autocomplétion (budget de 3s de
 * Discord), qui doit rester instantanée.
 */
export function peekCached(code, weekOffset = 0) {
  return cache.get(cacheKey(code, weekOffset))?.data ?? null;
}

/* Codes de groupe distincts actuellement en cache (toutes semaines confondues) — pour /admin refresh-all. */
export function getCachedGroupCodes() {
  return [...new Set([...cache.keys()].map((k) => k.split('#')[0]))];
}

/** Vide le cache d'un groupe précis (toutes semaines), ou de tout le cache si aucun code n'est fourni. */
export function invalidate(code) {
  if (!code) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${code}#`)) cache.delete(key);
  }
}

/** Statistiques pour /admin status (EF-10). */
export function getStats() {
  return {
    groupesEnCache: cache.size,
    totalScrapes,
    totalErrors,
    uptimeMs: Date.now() - startedAt.getTime(),
    derniersRafraichissements: [...cache.entries()].map(([key, e]) => ({
      code: key,
      fetchedAt: new Date(e.fetchedAt).toISOString(),
    })),
  };
}
