/**
 * AquaData Studio — Module Tableau de Données type Excel
 * Grille interactive avec :
 *  - colonnes/lignes ajoutables
 *  - valeurs numériques ou textes saisis manuellement
 *  - formules manuelles commençant par "=" (calcul sans moteur d'optimisation)
 *  - cellules calculées automatiquement liées aux formules
 */
export class DataGrid {
  constructor(tableId, formulaInputId) {
    this.table = document.getElementById(tableId);
    this.formulaInput = document.getElementById(formulaInputId);
    this.headers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    this.data = []; // tableau 2D des cellules : {v: valeur brute, t: 'num'|'txt'|'formula'}
    this.selected = { r: -1, c: -1 }; // -1 = en-tête
    this.range = null; // plage de sélection {r1, c1, r2, c2}
    this.editing = false;
    this.clipboard = null; // copier/coller
    this.onChange = null; // callback après modification des données

    // Grille initiale : 10 lignes x 5 colonnes
    for (let r = 0; r < 10; r++) {
      this.data[r] = [];
      for (let c = 0; c < 5; c++) this.data[r][c] = null;
    }

    this._bindEvents();
    this.render();
  }

  /* ---------- API données ---------- */
  colName(c) {
    return c < 26 ? this.headers[c] : this.headers[Math.floor(c / 26) - 1] + this.headers[c % 26];
  }

  getCell(r, c) {
    return (this.data[r] && this.data[r][c]) || null;
  }

  getRaw(r, c) {
    const cell = this.getCell(r, c);
    return cell ? cell.v : '';
  }

  getValue(r, c) {
    const cell = this.getCell(r, c);
    if (!cell) return 0;
    if (cell.t === 'formula') return Number(cell.eval) || 0;
    if (cell.t === 'num') return Number(cell.v) || 0;
    return parseFloat(String(cell.v).replace(',', '.')) || 0;
  }

  rowCount() { return this.data.length; }
  colCount() { return Math.max(...this.data.map(row => row.length), 1); }

  addRow() {
    const cols = this.colCount();
    this.data.push(new Array(cols).fill(null));
    this.render();
    if (this.onChange) this.onChange();
  }

  addCol() {
    const nb = Math.max(...this.data.map(row => row.length), 1);
    for (const row of this.data) row.push(null);
    // étend l'entête si nécessaire
    if (nb >= this.headers.length) {
      this.headers.push(String.fromCharCode(65 + (this.headers.length % 26)));
    }
    this.render();
    if (this.onChange) this.onChange();
  }

  delRow() {
    if (this.data.length <= 1) return;
    if (this.selected.r >= 0) this.data.splice(this.selected.r, 1);
    else this.data.pop();
    this.selected.r = Math.min(this.selected.r, this.data.length - 1);
    this.render();
    if (this.onChange) this.onChange();
  }

  delCol() {
    const cols = this.colCount();
    if (cols <= 1) return;
    const c = this.selected.c >= 0 ? this.selected.c : cols - 1;
    for (const row of this.data) row.splice(c, 1);
    if (c < this.headers.length) this.headers.splice(c, 1);
    this.selected.c = Math.min(this.selected.c, cols - 2);
    this.render();
    if (this.onChange) this.onChange();
  }

  copySelection() {
    const r1 = this.range ? this.range.r1 : this.selected.r;
    const c1 = this.range ? this.range.c1 : this.selected.c;
    const r2 = this.range ? this.range.r2 : this.selected.r;
    const c2 = this.range ? this.range.c2 : this.selected.c;
    if (r1 < 0 || c1 < 0) return;
    this.clipboard = [];
    for (let r = r1; r <= r2; r++) {
      const line = [];
      for (let c = c1; c <= c2; c++) line.push(JSON.parse(JSON.stringify(this.getCell(r, c))));
      this.clipboard.push(line);
    }
  }

  pasteSelection() {
    if (!this.clipboard || this.selected.r < 0 || this.selected.c < 0) return;
    for (let dr = 0; dr < this.clipboard.length; dr++) {
      for (let dc = 0; dc < this.clipboard[dr].length; dc++) {
        const r = this.selected.r + dr, c = this.selected.c + dc;
        if (!this.data[r]) this.data[r] = [];
        this.data[r][c] = this.clipboard[dr][dc]
          ? (this.clipboard[dr][dc].v.startsWith('=') ? null : JSON.parse(JSON.stringify(this.clipboard[dr][dc])))
          : null;
      }
    }
    this.render();
    if (this.onChange) this.onChange();
  }

  /* Statistiques de la plage sélectionnée (barre d'état Excel) */
  getSelectionStats() {
    const r1 = this.range ? this.range.r1 : this.selected.r;
    const c1 = this.range ? this.range.c1 : this.selected.c;
    const r2 = this.range ? this.range.r2 : this.selected.r;
    const c2 = this.range ? this.range.c2 : this.selected.c;
    if (r1 < 0 || c1 < 0) return { sum: 0, avg: 0, min: 0, max: 0, n: 0 };
    const vals = [];
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const v = this.getValue(r, c);
        if (v && !isNaN(v)) vals.push(v);
      }
    }
    if (!vals.length) return { sum: 0, avg: 0, min: 0, max: 0, n: 0 };
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      sum, avg: sum / vals.length, min: Math.min(...vals), max: Math.max(...vals), n: vals.length
    };
  }

  setData(rows) {
    this.data = [];
    for (const vals of rows) {
      this.data.push(vals.map(v => {
        if (v === null || v === undefined) return null;
        if (String(v).startsWith('=')) {
          const calc = this._evaluateFormula(String(v));
          return { v: String(v), t: 'formula', eval: calc };
        }
        if (typeof v === 'number') return { v: String(v), t: 'num' };
        return { v: String(v), t: 'txt' };
      }));
    }
    this.selected = { r: -1, c: -1 };
    if (this.formulaInput) this.formulaInput.value = '';
    this.render();
    if (this.onChange) this.onChange();
  }

  setHeaders(cols) {
    this.headers = [...cols];
    this.render();
    if (this.onChange) this.onChange();
  }

  getAllValues() {
    const rows = [];
    for (let r = 0; r < this.rowCount(); r++) {
      const line = [];
      for (let c = 0; c < this.colCount(); c++) {
        const cell = this.getCell(r, c);
        line.push(cell ? (cell.t === 'formula' ? cell.eval : cell.v) : '');
      }
      rows.push(line);
    }
    return rows;
  }

  /* ---------- Moteur de formules (calcul manuel type Excel) ---------- */
  _cellRef(ref) {
    const m = /^([A-Z]+)(\d+)$/.exec(ref.trim().toUpperCase());
    if (!m) return null;
    const c = m[1].split('').reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
    const r = parseInt(m[2], 10) - 1;
    if (r < 0 || r >= this.rowCount() || c < 0 || c >= this.colCount()) return NaN;
    return this.getValue(r, c);
  }

  _rangeValues(ref) {
    const m = /([A-Z]+)(\d+):([A-Z]+)(\d+)/.exec(ref.trim().toUpperCase());
    if (!m) return [];
    const c1 = m[1].split('').reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
    const r1 = parseInt(m[2], 10) - 1;
    const c2 = m[3].split('').reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
    const r2 = parseInt(m[4], 10) - 1;
    const vals = [];
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r >= 0 && r < this.rowCount() && c >= 0 && c < this.colCount()) vals.push(this.getValue(r, c));
      }
    }
    return vals;
  }

  _evaluateFormula(fx) {
    try {
      let expr = fx.trim();
      if (!expr.startsWith('=')) return null;
      expr = expr.slice(1).trim().replace(/,/g, '.');

      // Fonctions Excel / pandas-like
      const stats = (s) => {
        const v = this._rangeValues(s);
        const n = v.length;
        if (!n) return 0;
        const mean = v.reduce((a, b) => a + b, 0) / n;
        const stdev = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1));
        return { v, n, mean, stdev };
      };

      const funcs = {
        'SOMME(': (s) => this._rangeValues(s).reduce((a, b) => a + b, 0),
        'MOYENNE(': (s) => { const v = this._rangeValues(s); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; },
        'MIN(': (s) => Math.min(...this._rangeValues(s)),
        'MAX(': (s) => Math.max(...this._rangeValues(s)),
        'MEDIANE(': (s) => { const v = this._rangeValues(s).sort((a, b) => a - b); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : 0; },
        'NB(': (s) => this._rangeValues(s).filter(v => v !== 0).length,
        'NB.VIDE(': (s) => { const v = this._rangeValues(s); return v.length - v.filter(x => x !== 0).length; },
        'STDEV(': (s) => stats(s).stdev,                    // écart-type (pandas .std())
        'VAR(': (s) => stats(s).stdev ** 2,                 // variance (pandas .var())
        'MOYENNE.GEOMETRIQUE(': (s) => { const v = this._rangeValues(s).filter(x => x > 0); return v.length ? Math.pow(v.reduce((a, b) => a * b, 1), 1 / v.length) : 0; },
        'HARMONIQUE(': (s) => { const v = this._rangeValues(s).filter(x => x > 0); return v.length ? v.length / v.reduce((a, b) => a + 1 / b, 0) : 0; },
        'QUARTILE(': (s) => { const p = s.split(';'); const v = this._rangeValues(p[0] || '').sort((a, b) => a - b); const q = this._resolveArg(p[1] || '0'); const n = v.length; if (!n) return 0; const pos = q * (n - 1); const lo = Math.floor(pos), hi = Math.min(n - 1, Math.ceil(pos)); return v[lo] + (v[hi] - v[lo]) * (pos - lo); },
        'LOG10(': (s) => Math.log10(this._resolveArg(s)),
        'PUISSANCE(': (s) => { const p = s.split(';'); return Math.pow(this._resolveArg(p[0] || '0'), this._resolveArg(p[1] || '1')); },
        'RACINE(': (s) => Math.sqrt(this._resolveArg(s)),
        'ABS(': (s) => Math.abs(this._resolveArg(s)),
        'ARRONDI(': (s) => { const p = s.split(';'); const d = this._resolveArg(p[1] || '0'); const f = Math.pow(10, d); return Math.round(this._resolveArg(p[0] || '0') * f) / f; },
        'TENDANCE(': (s) => this._calcLinearTrend(s),       // régression linéaire (pandas linregress / numpy polyfit)
        'CORREL(': (s) => this._calcCorrelation(s),         // coefficient de corrélation (pandas .corr())
        'COEF.DETERMINATION(': (s) => this._calcCorrelation(s) ** 2, // R²
        'HMT(': (s) => this._calcHMT(s)
      };

      for (const [name, fn] of Object.entries(funcs)) {
        if (expr.startsWith(name)) {
          const idx = expr.indexOf(')');
          const args = expr.slice(name.length, idx);
          return fn(args);
        }
      }

      // HMT(P;Q) : formule manuelle de hauteur manométrique totale simplifiée
      // HMT = (P_sol + P_req + Δh_géo + pertes) — ici P en bars converti en mCE, Δh en m
      // Utilisation : =HMT(P;Q) avec P = pression en bars, Q = débit en m³/h
      // Retour : HMT en mCE (simple calcul, pas d'optimisation)

      // Opérateurs + − * / et parenthèses
      expr = expr.replace(/\b([A-Z]+\d+)\b/g, (m) => {
        const v = this._cellRef(m);
        return isNaN(v) ? '0' : String(v);
      });
      expr = expr.replace(/\^/g, '**');

      // Évaluation sécurisée
      // eslint-disable-next-line no-new-func
      const fn = new Function('return (' + expr + ')');
      const val = fn();
      return (typeof val === 'number' && isFinite(val)) ? val : null;
    } catch (e) {
      return null;
    }
  }

  _resolveArg(s) {
    s = (s || '').trim().replace(/,/g, '.');
    if (/^[A-Z]+\d+$/.test(s.toUpperCase())) {
      const v = this._cellRef(s);
      return isNaN(v) ? 0 : v;
    }
    // range simple (une cellule)
    if (!s) return 0;
    const v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }

  _calcHMT(args) {
    const parts = (args || '').split(';');
    const P = this._resolveArg(parts[0] || '0');   // pression en bars
    const Q = this._resolveArg(parts[1] || '0');    // débit en m³/h
    // Formule manuelle simplifiée : P (bar) => mCE (×10.2) + pertes linéaires estimées
    const hgeo = 40; // hauteur géométrique estimée (modifiable par l'utilisateur)
    const pertes = 0.15 * Math.pow(Q / 100, 2) * 50;
    return P * 10.2 + hgeo + pertes;
  }

  /* Régression linéaire type numpy.polyfit(x, y, 1) / scipy linregress.
     Syntaxe : =TENDANCE(séries_y; série_x; nouvelle_x)
     Prédit y pour les valeurs x par la droite des moindres carrés. */
  _calcLinearTrend(args) {
    const parts = (args || '').split(';');
    const y = this._rangeValues(parts[0] || '');
    const x = parts[1] && /^[A-Z]/i.test(parts[1])
      ? this._rangeValues(parts[1])
      : y.map((_, i) => i + 1);
    const newX = parts[2] ? this._resolveArg(parts[2]) : y.length + 1;
    const n = Math.min(y.length, x.length);
    if (!n) return 0;
    const mx = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const my = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - mx) * (y[i] - my);
      den += (x[i] - mx) ** 2;
    }
    const slope = den ? num / den : 0;
    const intercept = my - slope * mx;
    return slope * newX + intercept;
  }

  /* Coefficient de corrélation de Pearson type pandas DataFrame.corr().
     Syntaxe : =CORREL(plage_x; plage_y) */
  _calcCorrelation(args) {
    const parts = (args || '').split(';');
    const a = this._rangeValues(parts[0] || '');
    const b = this._rangeValues(parts[1] || '');
    const n = Math.min(a.length, b.length);
    if (n < 2) return 0;
    const ma = a.reduce((x, y) => x + y, 0) / n;
    const mb = b.reduce((x, y) => x + y, 0) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
      num += (a[i] - ma) * (b[i] - mb);
      da += (a[i] - ma) ** 2;
      db += (b[i] - mb) ** 2;
    }
    return da && db ? num / Math.sqrt(da * db) : 0;
  }

  /* ---------- Rendu HTML ---------- */
  render() {
    const cols = this.colCount();
    const inRange = (r, c) => this.range &&
      r >= this.range.r1 && r <= this.range.r2 &&
      c >= this.range.c1 && c <= this.range.c2;

    let html = '<tr><th class="rhead locked"></th>';
    for (let c = 0; c < cols; c++) {
      html += `<th class="hcol ${c === this.selected.c ? 'sel' : ''}" data-c="${c}">${this.colName(c)}</th>`;
    }
    html += '</tr>';

    for (let r = 0; r < this.rowCount(); r++) {
      html += `<tr><td class="rhead locked" data-r="${r}">${r + 1}</td>`;
      for (let c = 0; c < cols; c++) {
        const cell = this.getCell(r, c);
        let cls = 'cell';
        let display = '';
        if (cell) {
          if (cell.t === 'formula') { cls += ' formula'; display = cell.eval !== null && cell.eval !== undefined ? String(Number(cell.eval).toFixed(2)) : '⚠️'; }
          else if (cell.t === 'num') { cls += ' num'; display = cell.v; }
          else { cls += ' txt'; display = cell.v; }
        }
        if (this.selected.r === r && this.selected.c === c) cls += ' sel';
        else if (inRange(r, c)) cls += ' range';
        html += `<td class="${cls}" data-r="${r}" data-c="${c}" title="${cell && cell.t === 'formula' ? cell.v : ''}">${display}</td>`;
      }
      html += '</tr>';
    }
    this.table.innerHTML = html;
  }

  /* ---------- Événements ---------- */
  _bindEvents() {
    this.table.addEventListener('click', (e) => {
      if (this.editing) return;
      const td = e.target.closest('td');
      if (!td) return;
      const r = td.dataset.r, c = td.dataset.c;

      if (e.shiftKey && this.selected.r >= 0 && r !== undefined && c !== undefined) {
        // sélection par plage type Excel
        this.range = {
          r1: Math.min(this.selected.r, parseInt(r, 10)),
          c1: Math.min(this.selected.c, parseInt(c, 10)),
          r2: Math.max(this.selected.r, parseInt(r, 10)),
          c2: Math.max(this.selected.c, parseInt(c, 10))
        };
        this.selected = { r: parseInt(r, 10), c: parseInt(c, 10) };
      } else {
        this.range = null;
        if (r === undefined && c !== undefined) {
          this.selected = { r: -1, c: parseInt(c, 10) };
        } else if (r !== undefined && c !== undefined) {
          this.selected = { r: parseInt(r, 10), c: parseInt(c, 10) };
        }
      }
      this._syncFormulaBar();
      this._notifySelection();
      this.render();
    });

    // Navigation clavier type Excel (flèches, Entrée, Tab, édition F2)
    document.addEventListener('keydown', (e) => {
      if (!this.table.closest('.pane.on')) return; // actif seulement si l'onglet tableau est visible
      const r = this.selected.r, c = this.selected.c;
      if (r < 0 || c < 0) return;

      if (e.key === 'F2') {
        e.preventDefault();
        this._startEditing();
        return;
      }
      if (e.key === 'Delete' && !this.editing) {
        e.preventDefault();
        this._clearSelection();
        return;
      }
      const arrow = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
      if (arrow[e.key] && !this.editing) {
        e.preventDefault();
        this.range = null;
        this.selected = {
          r: Math.max(0, Math.min(this.rowCount() - 1, r + arrow[e.key][0])),
          c: Math.max(0, Math.min(this.colCount() - 1, c + arrow[e.key][1]))
        };
        this._syncFormulaBar();
        this._notifySelection();
        this.render();
        return;
      }
      if (e.key === 'Enter' && !this.editing) {
        e.preventDefault();
        this.range = null;
        this.selected = { r: Math.min(this.rowCount() - 1, r + 1), c };
        this._syncFormulaBar();
        this._notifySelection();
        this.render();
      }
      if (e.key === 'Tab' && !this.editing) {
        e.preventDefault();
        this.range = null;
        this.selected = { r, c: Math.min(this.colCount() - 1, c + 1) };
        this._syncFormulaBar();
        this._notifySelection();
        this.render();
      }
      if (e.key === 'Backspace' && !this.editing) {
        e.preventDefault();
        this._clearSelection();
      }
    });

    this.formulaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._applyFormulaInput();
        // descend d'une ligne comme Excel
        if (this.selected.r >= 0) this.selected = { r: Math.min(this.rowCount() - 1, this.selected.r + 1), c: this.selected.c };
        this._syncFormulaBar();
        this._notifySelection();
        this.render();
      } else if (e.key === 'Tab') {
        this._applyFormulaInput();
        if (this.selected.c >= 0) this.selected = { r: this.selected.r, c: Math.min(this.colCount() - 1, this.selected.c + 1) };
        this._syncFormulaBar();
        this._notifySelection();
        this.render();
        e.preventDefault();
      }
    });
    this.formulaInput.addEventListener('blur', () => {
      if (!this.editing) this._applyFormulaInput();
    });
  }

  _startEditing() {
    if (this.selected.r < 0 || this.selected.c < 0) return;
    this.editing = true;
    const cell = this.getCell(this.selected.r, this.selected.c);
    this.formulaInput.value = cell ? cell.v : '';
    this.formulaInput.focus();
    this.formulaInput.select();
    this.render();
  }

  _clearSelection() {
    const { r1, c1, r2, c2 } = this.range || { r1: this.selected.r, c1: this.selected.c, r2: this.selected.r, c2: this.selected.c };
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (this.data[r]) this.data[r][c] = null;
      }
    }
    this.range = null;
    this.render();
    if (this.onChange) this.onChange();
  }

  _syncFormulaBar() {
    const refLabel = document.getElementById('cellRefLabel');
    if (refLabel) {
      refLabel.textContent = (this.selected.r < 0 || this.selected.c < 0)
        ? '·'
        : `${this.colName(this.selected.c)}${this.selected.r + 1}`;
    }
    if (this.selected.r < 0 || this.selected.c < 0) {
      this.formulaInput.value = '';
      return;
    }
    const cell = this.getCell(this.selected.r, this.selected.c);
    if (cell) this.formulaInput.value = cell.v;
    else this.formulaInput.value = '';
  }

  _notifySelection() {
    if (this.onSelectionChange) this.onSelectionChange();
  }

  _applyFormulaInput() {
    if (this.selected.r < 0 || this.selected.c < 0) return;
    let input = (this.formulaInput.value || '').trim();

    let cell = null;
    if (input === '') {
      cell = null;
    } else if (input.startsWith('=')) {
      const evalVal = this._evaluateFormula(input);
      cell = { v: input, t: 'formula', eval: evalVal };
    } else if (!isNaN(parseFloat(input.replace(',', '.')))) {
      cell = { v: input.replace(',', '.'), t: 'num' };
    } else {
      cell = { v: input, t: 'txt' };
    }

    if (!this.data[this.selected.r]) this.data[this.selected.r] = [];
    this.data[this.selected.r][this.selected.c] = cell;
    this.render();
    if (this.onChange) this.onChange();
  }

  /* ---------- Exporter CSV ---------- */
  exportCsv() {
    const rows = [];
    rows.push(this.headers.slice(0, this.colCount()).join(';'));
    for (const line of this.getAllValues()) {
      rows.push(line.join(';'));
    }
    return rows.join('\n');
  }
}