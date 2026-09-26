import puppeteer from 'puppeteer';
import { getInviteUrl } from './config.js';

const PROMOTION_GENRE_LISTE = 'DIPLOME.EDT.EDT_LISTE';

export class ScrapeError extends Error {}
export class GroupeIntrouvableError extends ScrapeError {}

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

/** Ferme le navigateur partagé (utile pour un arrêt propre du process). */
export async function closeBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = null;
  await browser.close();
}

async function withPage(fn) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

async function gotoInvite(page) {
  await page.goto(getInviteUrl(), { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 500));
  // Le bandeau "Information" (cookies) apparaît de façon non déterministe et
  // peut intercepter les clics/saisies suivants s'il n'est pas fermé.
  const closeBtn = await page.$('[role="alertdialog"] button');
  if (closeBtn) {
    await closeBtn.evaluate((b) => b.click());
    await new Promise((r) => setTimeout(r, 300));
  }
}

/**
 * Attend qu'une option de menu/combobox dont le texte normalisé commence
 * par "<prefix> " apparaisse, puis clique dessus. Le " " utilisé par
 * l'interface entre le code et le libellé (ex: "B1J1 ‑ ...") est
 * normalisé en espace classique avant comparaison.
 */
async function pollClickOptionByPrefix(page, prefix, { attempts = 15, intervalMs = 300 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const label = await page.evaluate((p) => {
      const norm = (s) => s.replace(/\s+/g, ' ').trim();
      const opts = [...document.querySelectorAll('[role="option"]')];
      const opt = opts.find((el) => norm(el.textContent).startsWith(p + ' '));
      if (!opt) return null;
      const text = norm(opt.textContent);
      opt.click();
      return text;
    }, prefix);
    if (label) return label;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

/**
 * Sélectionne une promotion dans l'Espace Invité en tapant son code exact
 * (ex: "B1J1") dans le champ de recherche, puis clique la première option
 * dont le texte normalisé commence par "<code> ".
 */
async function selectPromotion(page, code) {
  const combo = await page.waitForSelector('input[aria-label="Sélectionnez une promotion"]', {
    timeout: 10000,
  });
  await combo.click({ clickCount: 3 });
  await combo.type(code, { delay: 30 });

  const label = await pollClickOptionByPrefix(page, code);
  if (!label) {
    throw new GroupeIntrouvableError(`Groupe "${code}" introuvable en espace invité.`);
  }
  await new Promise((r) => setTimeout(r, 1200));
  return label;
}

async function switchToListView(page) {
  const el = await page.waitForSelector(`[data-genre="${PROMOTION_GENRE_LISTE}"]`, { timeout: 8000 });
  await el.evaluate((node) => node.click());
  await new Promise((r) => setTimeout(r, 1200));
}

/**
 * Retire le voile `.BloquerInterface` (backdrop d'origine inconnue —
 * "bloquer l'interface", visuellement quasi invisible à 50% d'opacité)
 * qui reste présent au-dessus du sélecteur de semaines et intercepte tous
 * les clics/`elementFromPoint` à cet endroit. C'est ce voile, pas un vrai
 * blocage de la fonctionnalité, qui rendait la navigation par semaine
 * impossible — voir SPECIFICATION.md pour le détail de l'investigation.
 * Purement cosmétique : aucun effet sur les données ou l'accès, on rend
 * juste accessible un contenu déjà public que le voile masquait au clic.
 */
async function removeBlockers(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.BloquerInterface').forEach((el) => el.remove());
  });
}

/**
 * Décale la semaine affichée de `offset` par rapport à la semaine courante
 * (celle sélectionnée par défaut au chargement de la page). Seul
 * `-1`, `0` et `1` sont fiables : le clavier ("flèche" pour déplacer le
 * focus, "Entrée" pour basculer la sélection de la cellule focus) ne
 * semble répondre qu'une seule fois par chargement de page, quelle que
 * soit la façon dont le focus est ré-établi ensuite (voir SPECIFICATION.md)
 * — chaque appel de cette fonction doit donc partir d'une page fraîchement
 * chargée pour fonctionner.
 */
async function selectWeekOffset(page, offset) {
  if (offset === 0) return;
  if (offset !== 1 && offset !== -1) {
    throw new ScrapeError(`Décalage de semaine non supporté: ${offset} (seuls -1, 0, 1 sont fiables).`);
  }

  await removeBlockers(page);
  const cell = await page.$('.calendrier-jour.selected');
  if (!cell) throw new ScrapeError('Cellule de semaine sélectionnée introuvable.');
  await cell.click();
  await new Promise((r) => setTimeout(r, 300));

  await removeBlockers(page);
  await page.keyboard.press('Enter'); // désélectionne la semaine courante
  await new Promise((r) => setTimeout(r, 400));

  await removeBlockers(page);
  await page.keyboard.press(offset > 0 ? 'ArrowRight' : 'ArrowLeft');
  await new Promise((r) => setTimeout(r, 400));

  await removeBlockers(page);
  await page.keyboard.press('Enter'); // sélectionne la nouvelle semaine
  await new Promise((r) => setTimeout(r, 1500));
}

const MOIS = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
};

const JOURS_VALIDES = /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+(\S+)\s+(\d{4})$/i;

function parseDayHeader(text) {
  const m = JOURS_VALIDES.exec(text.trim());
  if (!m) return null;
  const [, , day, moisNom, year] = m;
  const month = MOIS[moisNom.toLowerCase()];
  if (month === undefined) return null;
  return { year: Number(year), month, day: Number(day) };
}

/** Décalage (en ms) entre UTC et `timeZone` à l'instant `date` (positif si en avance sur UTC). */
function getTimeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return asUtc - date.getTime();
}

/**
 * Construit l'instant UTC correspondant à une heure "murale" donnée dans le
 * fuseau Europe/Brussels (RG-04), sans dépendance externe — gère CET/CEST
 * automatiquement quelle que soit l'heure système du serveur hébergeant le
 * bot.
 */
function brusselsDateTime({ year, month, day }, hour, minute) {
  const utcGuess = Date.UTC(year, month, day, hour, minute);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), 'Europe/Brussels');
  return new Date(utcGuess - offset);
}

function parseHeureRange(text, ymd) {
  // ex: "08h40 - 10h40Annulé" ou "08h40 - 12h40"
  const m = /(\d{1,2})h(\d{2})\s*-\s*(\d{1,2})h(\d{2})/.exec(text);
  if (!m || !ymd) return null;
  const [, h1, m1, h2, m2] = m;
  return {
    start: brusselsDateTime(ymd, Number(h1), Number(m1)),
    end: brusselsDateTime(ymd, Number(h2), Number(m2)),
  };
}

/** Insère un séparateur entre codes de salle concaténés sans espace (ex: "CAD-B236CAD-C-43"). */
function splitSalles(text) {
  const spaced = text.replace(/([a-zà-ÿ0-9])([A-ZÀ-Ý]{2,}-)/g, '$1 / $2');
  return spaced;
}

/**
 * Extrait les lignes de la vue "en liste" actuellement affichée (une
 * semaine). Chaque ligne du tableau est reconstruite à partir des cellules
 * `[data-colonne]` — il y en a SIX, pas cinq comme on pourrait le croire en
 * ne regardant que les groupes "simples" : 0=horaires, 1=matière,
 * 2=enseignant, 3=**sous-groupe/option** (souvent vide, ex: "B2GP1 -
 * Programmation" pour un cours propre à une option au sein d'un groupe
 * combiné), 4=salle, 5=type. Se limiter à 5 colonnes décale salle/type
 * silencieusement dès qu'un cours a un sous-groupe.
 *
 * Regroupées sous le dernier en-tête `.Gras` qui est un VRAI jour de
 * semaine (ex: "mardi 22 septembre 2026"). L'Espace Invité réutilise aussi
 * `.Gras` pour des en-têtes de repli sans rapport ("2 séances de 13h40 à
 * 17h40", "Non placé", noms de mois du mini-calendrier) : les ignorer est
 * essentiel, sinon les cours qui suivent héritent d'un "jour" invalide et
 * sont silencieusement perdus au filtrage (bug observé : les cours du
 * vendredi disparaissaient car précédés d'un en-tête "X séances de...").
 *
 * Le nombre de cellules par LIGNE varie (5 ou 6) selon que ce cours a un
 * sous-groupe/option ou non — ce n'est pas fixe par groupe/promotion. On
 * collecte donc les cellules dans l'ordre puis on déduit leur sens par la
 * position depuis la fin (le type est toujours la dernière cellule, la
 * salle l'avant-dernière, le sous-groupe l'antépénultième s'il y en a 6).
 */
async function extractWeek(page) {
  const rawRows = await page.evaluate(() => {
    const dayRe = /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+\d{1,2}\s+\S+\s+\d{4}$/i;
    const main = document.querySelector('main') || document.body;
    const nodes = main.querySelectorAll('.Gras, [data-colonne]');
    let currentDay = null;
    const out = [];
    let currentRow = null;
    for (const el of nodes) {
      if (el.classList.contains('Gras')) {
        const text = el.textContent.trim();
        if (dayRe.test(text)) currentDay = text; // sinon: en-tête de repli, on garde le jour précédent
        continue;
      }
      const col = Number(el.getAttribute('data-colonne'));
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (col === 0) {
        if (currentRow) out.push(currentRow);
        currentRow = { day: currentDay, cells: [text] };
      } else if (currentRow) {
        currentRow.cells[col] = text;
      }
    }
    if (currentRow) out.push(currentRow);
    return out;
  });

  const parsedRows = rawRows.map((row) => {
    const cells = row.cells;
    // cells[0]=horaire, [1]=matière, [2]=enseignant, puis 2 ou 3 cellules
    // restantes selon la présence d'un sous-groupe.
    const tail = cells.slice(3).filter((c) => c !== undefined);
    const type = tail[tail.length - 1] ?? '';
    const salle = tail[tail.length - 2] ?? '';
    const sousGroupe = tail.length >= 3 ? tail[tail.length - 3] : '';
    return {
      day: row.day,
      horaire: cells[0] ?? '',
      matiere: cells[1] ?? '',
      enseignant: cells[2] ?? '',
      sousGroupe,
      salle,
      type,
    };
  });

  const events = [];
  for (const row of parsedRows) {
    if (!row.matiere || !row.day) continue; // ligne fantôme (en-tête)
    const dayDate = parseDayHeader(row.day);
    if (!dayDate) continue;
    const cancelled = row.horaire.includes('Annulé');
    const range = parseHeureRange(row.horaire, dayDate);
    if (!range) continue;
    events.push({
      start: range.start,
      end: range.end,
      subject: row.matiere,
      teacher: row.enseignant || null,
      subgroup: row.sousGroupe || null,
      room: row.salle ? splitSalles(row.salle) : null,
      type: row.type || null,
      distanciel: row.type === 'Distanciel',
      cancelled,
    });
  }
  events.sort((a, b) => a.start - b.start);
  return events;
}

/**
 * Récupère l'horaire d'une semaine pour une promotion donnée. `weekOffset`
 * décale par rapport à la semaine courante — seuls -1 (précédente), 0
 * (courante) et 1 (suivante) sont fiables, voir `selectWeekOffset` et
 * SPECIFICATION.md pour pourquoi une semaine arbitraire ne l'est pas.
 */
export async function getCurrentWeekSchedule(code, { weekOffset = 0 } = {}) {
  return withPage(async (page) => {
    await gotoInvite(page);
    const label = await selectPromotion(page, code);
    await switchToListView(page);
    await selectWeekOffset(page, weekOffset);
    const events = await extractWeek(page);
    return { code, label, events, weekOffset, scrapedAt: new Date() };
  });
}
