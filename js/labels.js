// labels.js
// Libellés métier lisibles pour les équipements (forages, stations, vannes, réservoirs).
// Remplace les codes techniques du type "F1_R500", "Forage1_SK10", "R500_to_R6_P1"
// par des noms parlants : "Forage SBA6", "Forage SK4", "Station Abida G1", etc.

export const EQUIP_LABELS = {
    // --- Champ de captage R500 : forages profonds ---
    'F1_R500': 'Forage SBA6',
    'F2_R500': 'Forage SBA6A',
    'F3_R500': 'Forage SBA7',
    'F4_R500': 'Forage SBA7A',
    'F5_R500': 'Forage SBA8',
    'F6_R500': 'Forage SBA10 bis',
    'F7_R500': 'Forage SBA10 ter',
    'F8_R500': 'Forage SBA12',
    'F9_R500': 'Forage Bourweg 1',
    'F10_R500': 'Forage Bourweg 2 bis',
    'F11_R500': 'Forage Bourweg 3',
    'F12_R500': 'Forage Zwarine 2 bis',

    // --- Forages / sources annexes ---
    'Forage_Ain_Bidha_Pmp': 'Forage Aïn Bidha',
    'Source_Ain_Bidha_Pmp': 'Source Aïn Bidha',

    // --- Zone SK10 ---
    'Forage1_SK10': 'Forage SK4',
    'Forage2_SK10': 'Forage SK5',
    'Forage3_SK10': 'Forage SK8',

    // --- Stations de reprise / pompage Abida & chaîne Aïn Bidha ---
    'R500_to_R6_P1': 'Station Abida G1',
    'R500_to_R6_P2': 'Station Abida G2',
    'Ain_Bidha_to_Zaaf_P1': 'Station Aïn Bidha G1',
    'Ain_Bidha_to_Zaaf_P2': 'Station Aïn Bidha G2',
    'Zaaf_to_Birchag_P1': 'Station Zaafrane',
    'Birchagroun_to_R6': 'Station Bir Chagroun',

    // --- Adduction / bâches ---
    'R6_to_R1_P1': 'R6 → R1 · Bâche G1',
    'R6_to_R1_P2': 'R6 → R1 · Bâche G2',
    'R1_to_R2_P1': 'R1 → R2 · Ras El Aïn G1',
    'R1_to_R2_P2': 'R1 → R2 · Ras El Aïn G2',
    'R1_to_R3_P1': 'R1 → R3 · Ras El Aïn G1',
    'R1_to_R3_P2': 'R1 → R3 · Ras El Aïn G2',
    'SK10_to_R6_P1': 'Relais SK10 → R6',

    // --- Vannes gravitaires ---
    'R6_vers_R5': 'Vanne R6 → R5',
    'R1_vers_R7': 'Vanne R1 → R7',
    'R3_vers_R10': 'Vanne R3 → R10',
    'Source_Romaine_vers_R1': 'Vanne Source Romaine → R1'
};

export const RESERVOIR_LABELS = {
    'R500': 'R500 · Captage Forages',
    'R6': 'R6 · Réservoir Pivot',
    'R5': 'R5 · Basse Zone',
    'R1': 'R1 · Zone Moyenne',
    'R2': 'R2 · Reprise',
    'R3': 'R3 · Reprise Est',
    'R7': 'R7 · Haute Zone',
    'R10': 'R10 · Terminal',
    'ST_Ain_Bidha': 'Station Aïn Bidha',
    'ST_Zaafrane': 'Station Zaafrane',
    'ST_Birchagroun': 'Station Bir Chagroun',
    'ST_SK10_Relais': 'Réservoir SK10 Relais'
};

// Catégorie d'un équipement pour le choix du pictogramme / de la couleur
export function equipKind(id) {
    if (!id) return 'station';
    const s = String(id);
    if (/^F\d+_R500$/i.test(s) || s.indexOf('Forage') === 0 || s.indexOf('Source_') === 0) return 'forage';
    if (s.indexOf('_vers_') !== -1) return 'vanne';
    return 'station';
}

// Pictogramme associé à la catégorie
export function equipIcon(id) {
    switch (equipKind(id)) {
        case 'forage': return '💧';
        case 'vanne': return '🚰';
        default: return '⚙️';
    }
}

// Lecture des libellés personnalisés (compatibilité avec l'éditeur de libellés du cockpit)
function readCustomLabels() {
    try {
        const raw = localStorage.getItem('scada_custom_labels');
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

// Libellé lisible complet pour un équipement / ouvrage
export function equipLabel(id) {
    if (!id) return '—';
    const s = String(id);
    const custom = readCustomLabels();
    if (custom && custom[s] && String(custom[s]).trim() !== '') return String(custom[s]).trim();
    if (EQUIP_LABELS[s]) return EQUIP_LABELS[s];

    // Dernier recours : transformation propre du code technique
    return s
        .replace('_to_', ' → ')
        .replace('_vers_', ' → ')
        .replace('_Pmp', '')
        .replace(/_/g, ' ');
}

// Libellé lisible pour un réservoir
export function reservoirLabel(id) {
    if (!id) return '—';
    const s = String(id);
    if (RESERVOIR_LABELS[s]) return RESERVOIR_LABELS[s];
    return s.replace(/_/g, ' ');
}