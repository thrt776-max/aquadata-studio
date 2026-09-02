/**
 * AquaData Studio - Schéma de Données du Système AEP
 * 
 * Ce fichier contient toutes les données initiales décrivant le réseau d'eau.
 * Ces valeurs sont utilisées pour initialiser l'application et peuvent être
 * modifiées par l'utilisateur via l'interface du tableau de bord.
 */

export const HORIZON = Array.from({ length: 24 }, (_, i) => i);

// Grille issue du bilan KEF optimal : Nuit 23h-08h, Pointe matin 08h-13h, Jour 13h-19h, Pointe soir 19h-23h
const P_JOUR = 0.290, P_P_MAT = 0.290, P_P_SOIR = 0.377, P_NUIT = 0.222;
export const cout_TPH = HORIZON.map(t => {
    if (t >= 23 || t < 8) return P_NUIT;        // Nuit : 23h00 → 08h00
    if (t < 13) return P_P_MAT;                  // Pointe matin : 08h00 → 13h00
    if (t < 19) return P_JOUR;                   // Jour : 13h00 → 19h00
    return P_P_SOIR;                             // Pointe soir : 19h00 → 23h00
});
export const COUT_TPH = cout_TPH;

// Grille STEG - Tarif Uniforme (TU)
const P_UNIFORME = 0.291;
export const COUT_TU = Array(24).fill(P_UNIFORME);

export const TARIFS = {
    TPH: COUT_TPH,
    TU: COUT_TU
};

// Groupes de pompage (Débits en m³/h, Puissances en kW, Tarification STEG)
export const POMPES = {
    "F1_R500":  {"debit": 54.0, "puissance": 16.3,  "tarif": "TPH"}, 
    "F2_R500":  {"debit": 39.6, "puissance": 11.2,  "tarif": "TPH"}, 
    "F3_R500":  {"debit": 28.8, "puissance": 10.0,  "tarif": "TPH"}, 
    "F4_R500":  {"debit": 72.0, "puissance": 29.4,  "tarif": "TPH"}, 
    "F5_R500":  {"debit": 108.0, "puissance": 37.5, "tarif": "TPH"}, 
    "F6_R500":  {"debit": 36.0, "puissance": 13.2,  "tarif": "TPH"}, 
    "F7_R500":  {"debit": 25.2, "puissance": 14.6,  "tarif": "TPH"}, 
    "F8_R500":  {"debit": 90.0,  "puissance": 47.0,  "tarif": "TPH"}, 
    "F9_R500":  {"debit": 126.0, "puissance": 61.6, "tarif": "TPH"}, 
    "F10_R500": {"debit": 36.0, "puissance": 21.9,  "tarif": "TPH"}, 
    "F11_R500": {"debit": 97.2, "puissance": 30.8,  "tarif": "TPH"}, 
    "F12_R500": {"debit": 180.0, "puissance": 51.4, "tarif": "TPH"}, 
    "R500_to_R6_P1": {"debit": 576.0, "puissance": 148.1, "tarif": "TPH"}, 
    "R500_to_R6_P2": {"debit": 475.2, "puissance": 109.9, "tarif": "TPH"}, 
    "R6_to_R1_P1":   {"debit": 396.0, "puissance": 123.9, "tarif": "TPH"}, 
    "R6_to_R1_P2":   {"debit": 360.0, "puissance": 163.5, "tarif": "TPH"}, 
    "R1_to_R2_P1":   {"debit": 108.0, "puissance": 34.1,  "tarif": "TPH"}, 
    "R1_to_R2_P2":   {"debit": 97.2, "puissance": 31.5,  "tarif": "TPH"}, 
    "R1_to_R3_P1":   {"debit": 90.0, "puissance": 36.1,  "tarif": "TPH"}, 
    "R1_to_R3_P2":   {"debit": 144.0, "puissance": 61.9, "tarif": "TPH"}, 
    "Forage_Ain_Bidha_Pmp": {"debit": 65.8, "puissance": 7.9, "tarif": "TU"}, 
    "Source_Ain_Bidha_Pmp": {"debit": 14.4, "puissance": 0.8, "tarif": "TU"}, 
    "Ain_Bidha_to_Zaaf_P1":  {"debit": 28.8, "puissance": 2.2, "tarif": "TU"}, 
    "Ain_Bidha_to_Zaaf_P2":  {"debit": 64.8, "puissance": 12.4, "tarif": "TU"}, 
    "Zaaf_to_Birchag_P1":    {"debit": 46.8, "puissance": 20.4, "tarif": "TU"}, 
    "Birchagroun_to_R6":     {"debit": 132.8, "puissance": 30.0, "tarif": "TU"}, 
    "Forage1_SK10":  {"debit": 43.2, "puissance": 16.1,  "tarif": "TU"}, 
    "Forage2_SK10":  {"debit": 14.4, "puissance": 6.2,  "tarif": "TU"}, 
    "Forage3_SK10":  {"debit": 36.0, "puissance": 13.6,  "tarif": "TU"}, 
    "SK10_to_R6_P1": {"debit": 36.0, "puissance": 13.0, "tarif": "TU"}, 
};

// Vannes gravitaires (Débits maximaux nominaux)
export const VANNES_GRAVITAIRES = { 
    "R6_vers_R5":              {"debit_max": 200.0}, 
    "R1_vers_R7":              {"debit_max": 120.0}, 
    "R3_vers_R10":             {"debit_max": 60.0}, 
    "Source_Romaine_vers_R1":  {"debit_max": 100.0} 
};

// Profils horaires par défaut des débits des vannes gravitaires (00h à 23h)
export const DEFAULT_VANNES_HORAIRES = {
    "R6_vers_R5":              [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,15.5,161.7,198.6,200.0,200.0,200.0,200.0,200.0,200.0,200.0,200.0,200.0,200.0,200.0,200.0],
    "R1_vers_R7":              [120.0,120.0,120.0,120.0,120.0,69.1,21.6,59.5,103.0,76.3,120.0,0.0,0.0,0.0,0.0,0.0,92.8,120.0,120.0,120.0,120.0,0.0,0.0,94.7],
    "R3_vers_R10":             [0.0,60.0,3.4,60.0,60.0,60.0,60.0,29.8,12.2,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,60.0,60.0,51.8],
    "Source_Romaine_vers_R1":  [100.0,73.5,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0]
};

// Capacités des réservoirs: [V_min, V_max, V_initial]
export const CAPACITES = { 
    "R500": [100.0, 500.0, 250.0], "R6": [500.0, 5000.0, 1315.0], "R5": [150.0, 1500.0, 866.0], 
    "R1": [100.0, 500.0, 381.0], "R2": [100.0, 500.0, 323.0], "R3": [100.0, 500.0, 211.0], 
    "R7": [150.0, 1500.0, 961.0], "R10": [200.0, 1000.0, 782.0], 
    "ST_Ain_Bidha": [10.0, 150.0, 75.0], "ST_Zaafrane": [10.0, 120.0, 60.0], 
    "ST_Birchagroun": [10.0, 100.0, 50.0], "ST_SK10_Relais": [10.0, 100.0, 50.0], 
};

// Coefficients de modulation de la demande horaire
export const COEFS = { 
    "E1": [ 0.56, 0.55, 0.5, 0.46, 0.46, 0.49, 0.59, 1.04, 1.29, 1.39, 1.37, 1.34, 1.29, 1.24, 1.11, 1.06, 1.14, 1.24, 1.39, 1.49, 1.36, 1.1, 0.84, 0.67 ],  
    "E2": [ 0.9, 0.6, 0.4, 0.35, 0.3, 0.34, 0.33, 0.51, 1.09, 1.53, 1.67, 1.66, 1.61, 1.49, 1.43, 1.11, 0.94, 1.28, 1.32, 1.29, 1.24, 1.25, 0.97, 0.93 ],  
    "E3": [ 0.77, 0.68, 0.61, 0.56, 0.51, 0.54, 0.54, 0.58, 0.78, 1.07, 1.4, 1.44, 1.67, 1.36, 1.17, 1.21, 1.07, 0.95, 1.22, 1.32, 1.09, 1.43, 1.59, 0.78 ],  
    "E4": [ 0.5, 0.63, 0.44, 0.42, 0.38, 0.44, 0.48, 0.76, 0.97, 1.27, 1.39, 1.39, 1.36, 1.28, 1.01, 1.16, 1.19, 1.39, 1.39, 1.39, 1.34, 1.32, 0.86, 0.88 ],  
    "E5": [ 1.03, 0.99, 0.96, 0.88, 0.87, 0.78, 0.36, 0.2, 0.36, 0.74, 0.7, 1.38, 1.36, 1.33, 1.21, 1.17, 1.31, 1.3, 1.38, 1.38, 1.32, 1.36, 1.09, 1.12 ],  
    "E6": [ 0.67, 0.34, 0.19, 0.23, 0.14, 0.23, 0.29, 0.82, 1.42, 1.55, 1.65, 1.3, 1.38, 1.2, 0.92, 0.92, 1.09, 1.16, 1.49, 1.59, 1.45, 1.39, 1.23, 1.01 ],  
    "E7": [ 0.56, 0.52, 0.5, 0.47, 0.47, 0.52, 0.86, 1.36, 1.27, 1.34, 1.29, 1.34, 1.31, 1.43, 1.37, 0.97, 0.89, 1.11, 1.03, 1.39, 1.14, 0.93, 0.75, 0.63 ],
};

// Demande moyenne journalière pour chaque étage de consommation
export const DEMANDE_MOYENNE = {"E1": 355.7, "E2": 65.8, "E3": 28.3, "E4": 116.3, "E5": 197.7, "E6": 72.57, "E7": 21.9};

// ── TOPOLOGIE D'ALIMENTATION DES ÉTAGES ─────────────────────────────
// Chaque étage de consommation est alimenté depuis un réservoir précis :
//   E1 ← R1 · E2 ← R2 · E3 ← R3 · E4 ← R5 · E5 ← R6 · E6 ← R7 · E7 ← R10
export const ETAGE_FEEDERS = {
    "E1": "R1", "E2": "R2", "E3": "R3", "E4": "R5",
    "E5": "R6", "E6": "R7", "E7": "R10"
};

// Libellé clair : « Étage alimenté par R1 » (+ détail optionnel entre parenthèses)
export function etageLabel(etage, detail = '') {
    const feeder = ETAGE_FEEDERS[etage];
    const base = feeder ? `Étage alimenté par ${feeder}` : `Étage ${etage}`;
    return detail ? `${base} (${detail})` : base;
}

// Calcul de la demande horaire pour chaque étage
export const DEMANDE_HORAIRE = Object.keys(DEMANDE_MOYENNE).reduce((acc, etage) => {
    acc[etage] = HORIZON.map(t => DEMANDE_MOYENNE[etage] * COEFS[etage][t]);
    return acc;
}, {});
