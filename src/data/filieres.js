/**
 * Catalogue statique filière -> groupes, utilisé pour le menu déroulant de sélection de classe.
 *
 * Ce catalogue a été assemblé en scrappant les données du site de l'école (Espace Invité, champ "Sélectionnez une promotion") et en les nettoyant.
 *
 * Mise à jour : si un groupe manque prévenez moi sur discord et je l'ajouterai. Je ne peux pas le faire automatiquement car je n'ai pas accès au site de l'école.
 */

export const FILIERES = [
  {
    id: 'graphisme',
    label: 'Technique de graphisme / infographie (B1)',
    groups: [
      { code: 'B1A1', label: 'B1A1 — Groupe 1' },
      { code: 'B1A2', label: 'B1A2 — Groupe 2' },
      { code: 'B1B1', label: 'B1B1 — Groupe 1' },
      { code: 'B1B2', label: 'B1B2 — Groupe 2' },
      { code: 'B1C1', label: 'B1C1 — Groupe 1' },
      { code: 'B1C2', label: 'B1C2 — Groupe 2' },
      { code: 'B1D1', label: 'B1D1 — Groupe 1' },
      { code: 'B1D2', label: 'B1D2 — Groupe 2' },
      { code: 'B1E1', label: 'B1E1 — Groupe 1' },
      { code: 'B1E2', label: 'B1E2 — Groupe 2' },
      { code: 'B1F1', label: 'B1F1 — Groupe 1' },
      { code: 'B1F2', label: 'B1F2 — Groupe 2' },
      { code: 'B1G1', label: 'B1G1 — HD' },
    ],
  },
  {
    id: 'jeuvideo-b1',
    label: 'Bachelier Jeu Vidéo (B1)',
    groups: [
      { code: 'B1J1', label: 'B1J1 — Groupe 1' },
      { code: 'B1J2', label: 'B1J2 — Groupe 2' },
      { code: 'B1J3', label: 'B1J3 — Groupe 3' },
      { code: 'B1J4', label: 'B1J4 — Groupe 4' },
      { code: 'B1J5', label: 'B1J5 — Groupe 5' },
      { code: 'B1J6', label: 'B1J6 — Groupe 6' },
      { code: 'B1J7', label: 'B1J7 — Groupe 7' },
      { code: 'B1J8', label: 'B1J8 — Groupe 8' },
      { code: 'B1K1', label: 'B1K1 — Charleroi' },
      { code: 'B1L1', label: 'B1L1 — HD' },
    ],
  },
  {
    id: 'jeuvideo-b2b3',
    label: 'Bachelier Jeu Vidéo (B2/B3)',
    groups: [
      { code: 'B2J1', label: 'B2J1 — Groupe 1' },
      { code: 'B2J2', label: 'B2J2 — Groupe 2' },
      { code: 'B2J3', label: 'B2J3 — Groupe 3' },
      { code: 'B2J4', label: 'B2J4 — Groupe 4' },
      { code: 'B3J1', label: 'B3J1 — Groupe 1' },
      { code: 'B3J2', label: 'B3J2 — Groupe 2' },
      // NOTE: B3 a aussi des sous-groupes "Options" (B3GA1 Game Art 1,
      // B3GA2 Game Art 2, B3GD1 Game Design, B3GP1 Programmation, B3TA1
      // Tech Art), visibles dans le sélecteur du site mais volontairement
      // PAS listés ici : notre scraper ne parvient pas à les sélectionner
      // (recherche directe par code infructueuse ; nécessitent probablement
      // un toggle d'affichage "TD/Options" non automatisé de façon fiable).
    ],
  },
  {
    id: 'transmedia',
    label: 'Architecture Transmédia (B1 à M2)',
    groups: [
      { code: 'B1T1', label: 'B1T1 — Groupe 1' },
      { code: 'B1T2', label: 'B1T2 — Groupe 2' },
      { code: 'B2T1', label: 'B2T1' },
      { code: 'B3T1', label: 'B3T1' },
      { code: 'B4T1', label: 'B4T1 — Master 1' },
      { code: 'B4U1', label: 'B4U1 — Master 1 (soir)' },
      { code: 'B5T1', label: 'B5T1 — Master 2' },
    ],
  },
  {
    id: 'visualeffect',
    label: 'Visual Effect 3D',
    groups: [
      { code: 'B2A1', label: 'B2A1 — Groupe 1' },
      { code: 'B2A2', label: 'B2A2 — Groupe 2' },
      { code: 'B3A1', label: 'B3A1' },
    ],
  },
  {
    id: 'filmanimation',
    label: 'Film Animation 3D',
    groups: [
      { code: 'B2B1', label: 'B2B1 — Groupe 1' },
      { code: 'B2B2', label: 'B2B2 — Groupe 2' },
      { code: 'B3B1', label: 'B3B1' },
    ],
  },
  {
    id: 'commgraph',
    label: 'Communication Graphique et Publicité',
    groups: [
      { code: 'B2F1', label: 'B2F1 — Groupe 1' },
      { code: 'B2F2', label: 'B2F2 — Groupe 2' },
      { code: 'B2F3', label: 'B2F3 — Groupe 3' },
      { code: 'B3F1', label: 'B3F1 — Groupe 1' },
      { code: 'B3F2', label: 'B3F2 — Groupe 2' },
    ],
  },
  {
    id: 'designweb',
    label: 'Design Web',
    groups: [
      { code: 'B2G1', label: 'B2G1' },
      { code: 'B3G1', label: 'B3G1' },
    ],
  },
  {
    id: 'dessinanim',
    label: "Métiers du Dessin d'Animation",
    groups: [
      { code: 'B2H1', label: 'B2H1 — Groupe 1' },
      { code: 'B2H2', label: 'B2H2 — Groupe 2' },
      { code: 'B2H3', label: 'B2H3 — Groupe 3' },
      { code: 'B2H4', label: 'B2H4 — Groupe 4' },
      { code: 'B3H1', label: 'B3H1 — Groupe 1' },
      { code: 'B3H2', label: 'B3H2 — Groupe 2' },
    ],
  },
  {
    id: 'imagereelle',
    label: 'Image Réelle',
    groups: [
      { code: 'B2I1', label: 'B2I1' },
      { code: 'B3I1', label: 'B3I1' },
    ],
  },
  {
    id: 'comptagestion',
    label: 'Comptabilité et Gestion (économique)',
    groups: [
      { code: 'E1A1', label: 'E1A1 — Compta Gestion' },
      { code: 'E1C1', label: 'E1C1 — Compta Fiscalité' },
      { code: 'E1G1', label: 'E1G1 — Compta Éco' },
      { code: 'E1H1', label: 'E1H1 — Compta Publique' },
    ],
  },
  {
    id: 'assistdirection',
    label: 'Assistant de Direction (économique)',
    groups: [
      { code: 'E1B1', label: 'E1B1 — B1' },
      { code: 'E2B1', label: 'E2B1 — B2' },
      { code: 'E3B1', label: 'E3B1 — B3' },
    ],
  },
  {
    id: 'relpubliques',
    label: 'Relations Publiques (économique)',
    groups: [
      { code: 'E1D1', label: 'E1D1 — Web, Groupe 1' },
      { code: 'E1D2', label: 'E1D2 — Web, Groupe 2' },
      { code: 'E1D3', label: 'E1D3 — Web, Groupe 3' },
      { code: 'E1E1', label: 'E1E1 — Comm. Multilingue' },
      { code: 'E1F1', label: 'E1F1 — Journalisme' },
      { code: 'E1J1', label: 'E1J1 — Comm. Art & Culture' },
    ],
  },
  {
    id: 'puericulture',
    label: 'Éducation de l\'enfance (AEJE, pédagogique)',
    groups: [
      { code: 'P1E1', label: 'P1E1 — Groupe 1' },
      { code: 'P1E2', label: 'P1E2 — Groupe 2' },
      { code: 'P1E3', label: 'P1E3 — Groupe 3' },
    ],
  },
  {
    id: 'sectionpedago',
    label: 'Autres sections (pédagogique)',
    groups: [
      { code: 'P1F1', label: 'P1F1 — Section 1, Groupe 1' },
      { code: 'P1F2', label: 'P1F2 — Section 1, Groupe 2' },
      { code: 'P1G1', label: 'P1G1 — Section 2, Groupe 1' },
      { code: 'P1G2', label: 'P1G2 — Section 2, Groupe 2' },
      { code: 'P1H1', label: 'P1H1 — Section 3' },
      { code: 'P2B1', label: 'P2B1 — Primaire (ancien système)' },
      { code: 'P3B1', label: 'P3B1 — Primaire (ancien système)' },
    ],
  },
];

/* Recherche une filière => id */
export function getFiliere(id) {
  return FILIERES.find((f) => f.id === id) ?? null;
}

/* Recherche un groupe par son code dans toutes les filières */
export function findGroupByCode(code) {
  const upper = code.trim().toUpperCase();
  for (const filiere of FILIERES) {
    const groupe = filiere.groups.find((g) => g.code === upper);
    if (groupe) return { ...groupe, filiereId: filiere.id, filiereLabel: filiere.label };
  }
  return null;
}
