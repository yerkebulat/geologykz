/* VSEGEI geological index decoder, JavaScript port of vsegei_decode.py.
 * Usage (Node):   const { createDecoder } = require('./vsegei_decode.js');
 *                 const dec = createDecoder(require('./dictionary.json'));
 *                 dec.decode('γδO₃-S₁')  ->  { status, en, ru, kk, ages, rock_groups, ... }
 * Usage (browser): <script src="vsegei_decode.js"></script> then VsegeiDecoder.createDecoder(dictionaryObject)
 * Both implementations follow the same algorithm; test_parity.js checks them against each other.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VsegeiDecoder = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₊': '+', '₋': '-' };
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-' };
  const SUBCH = '₀₁₂₃₄₅₆₇₈₉';
  const SUPCH = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const DASHES = '-\u2013\u2014\u2212\u2010\u2011';
  const CYR2LAT = { 'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X',
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'к': 'k', 'м': 'm', 'т': 't', 'н': 'h', 'в': 'b', 'і': 'i' };
  const GRK2LAT_TAIL = { 'ρ': 'p', 'ν': 'v', 'α': 'a', 'ο': 'o', 'ι': 'i', 'κ': 'k', 'τ': 't', 'υ': 'y', 'χ': 'x' };
  const GREEK = new Set(Array.from('γδνσξεηυλτ' + 'αβφζιωκΓΝΣρπμ'));
  const ONE_SYS = { Q: 'Q', N: 'N', K: 'K', J: 'J', T: 'T', P: 'P', C: 'C', D: 'D', S: 'S', O: 'O', R: 'R', V: 'V', 'Є': 'Cm', '€': 'Cm', 'Ɛ': 'Cm', 'ϵ': 'Cm' };
  const TWO_SYS = { Cm: 'Cm', Pg: 'Pg', Pz: 'Pz', Mz: 'Mz', Kz: 'Kz', Sn: 'Sn', AR: 'AR', PR: 'PR', Pt: 'PR' };
  const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  const LATIN_MODS = 'alqp';
  const ROMAN_REV = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };

  const isLower = (c) => c.length === 1 && c >= 'a' && c <= 'z';
  const isUpper = (c) => c.length === 1 && c >= 'A' && c <= 'Z';
  const isDigit = (c) => c.length === 1 && c >= '0' && c <= '9';
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const inStr = (c, s) => c.length > 0 && s.indexOf(c) >= 0;
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const isSpace = (c) => /\s/.test(c);

  function tokenize(s) {
    const chars = Array.from(s);
    const toks = [], warns = [];
    let sp = false;
    let i = 0;
    const n = chars.length;
    while (i < n) {
      const ch = chars[i];
      if (isSpace(ch)) { sp = true; i++; continue; }
      if (ch === '^' || ch === '_') {
        const m = ch === '^' ? 'sup' : 'sub';
        i++;
        if (i < n && chars[i] === '{') {
          let j = chars.indexOf('}', i);
          if (j < 0) j = n;
          for (let k = i + 1; k < j; k++) {
            let cc = chars[k];
            if (inStr(cc, DASHES)) cc = '-';
            if (!isSpace(cc)) { toks.push({ c: cc, m: m, sp: sp }); sp = false; }
          }
          i = j + 1;
        } else {
          while (i < n && (isDigit(chars[i]) || ((inStr(chars[i], DASHES) || chars[i] === '+') && i + 1 < n && isDigit(chars[i + 1]) && i > 0 && isDigit(chars[i - 1])))) {
            const cc = inStr(chars[i], DASHES) ? '-' : chars[i];
            toks.push({ c: cc, m: m, sp: sp });
            sp = false;
            i++;
          }
        }
        continue;
      }
      if (has(SUB, ch)) toks.push({ c: SUB[ch], m: 'sub', sp: sp });
      else if (has(SUP, ch)) toks.push({ c: SUP[ch], m: 'sup', sp: sp });
      else if (inStr(ch, DASHES)) toks.push({ c: '-', m: 'b', sp: sp });
      else if (has(CYR2LAT, ch)) { toks.push({ c: CYR2LAT[ch], m: 'b', sp: sp }); warns.push('cyrillic_lookalike:' + ch + '>' + CYR2LAT[ch]); }
      else if (ch === 'Г') { toks.push({ c: 'Γ', m: 'b', sp: sp }); warns.push('cyrillic_lookalike:Г>Γ'); }
      else if (inStr(ch, "′'’")) toks.push({ c: '′', m: 'b', sp: sp });
      else toks.push({ c: ch, m: 'b', sp: sp });
      sp = false;
      i++;
    }
    return { toks, warns };
  }

  function digitsStr(lst, rel, table) {
    if (!lst || !lst.length) return '';
    let s = table[lst[0]];
    if (lst.length > 1) {
      const conn = (rel || 'range') === 'and' ? '+' : '-';
      if (table === SUBCH) s += conn === '-' ? '₋' : '₊';
      else s += conn === '-' ? '⁻' : '⁺';
      s += table[lst[1]];
    }
    return s;
  }
  function romanStr(lst) {
    let s = ROMAN_REV[lst[0]];
    if (lst.length > 1) s += '-' + ROMAN_REV[lst[1]];
    return s;
  }
  const chAt = (table, i) => Array.from(table)[i];

  function createDecoder(D) {
    const sysById = {};
    D.systems.forEach((s) => { sysById[s.id] = s; });
    const stages = {};
    D.stages.forEach((st) => { (stages[st.system] = stages[st.system] || {})[st.abbr] = st; });
    const rock = {}, compound = {}, gen = {};
    D.rock_symbols.forEach((r) => { rock[r.sym] = r; });
    D.rock_compounds.forEach((r) => { compound[r.sym] = r; });
    D.q_genetic.forEach((g) => { gen[g.sym] = g; });
    const SG = D.series_generic;

    // digit tables as arrays so index works with Array.from
    const subTab = Array.from(SUBCH), supTab = Array.from(SUPCH);
    function dstr(lst, rel, which) {
      if (!lst || !lst.length) return '';
      const tab = which === 'sub' ? subTab : supTab;
      let s = tab[lst[0]];
      if (lst.length > 1) {
        const conn = (rel || 'range') === 'and' ? '+' : '-';
        if (which === 'sub') s += conn === '-' ? '₋' : '₊';
        else s += conn === '-' ? '⁻' : '⁺';
        s += tab[lst[1]];
      }
      return s;
    }

    class Parse {
      constructor(text) {
        this.text = text;
        const t = tokenize(text);
        this.toks = t.toks;
        this.warnings = t.warns;
        this.i = 0;
        this.reasons = [];
        this.questionable = false;
        this.unc = [];
      }
      peek(k) { const j = this.i + (k || 0); return j < this.toks.length ? this.toks[j] : null; }
      eatQ() {
        let t = this.peek();
        while (t !== null && t.c === '?') { this.questionable = true; this.i++; t = this.peek(); }
      }
      noteUnc(tag) { if (this.unc.indexOf(tag) < 0) this.unc.push(tag); }
      sysAt(k) {
        const t = this.peek(k);
        if (t === null || t.m !== 'b') return null;
        const t2 = this.peek(k + 1);
        if (t2 !== null && t2.m === 'b' && !t2.sp) {
          const two = t.c + t2.c;
          if (has(TWO_SYS, two)) return [TWO_SYS[two], 2, two === 'Pt' ? 'alias:' + two : null];
        }
        if (has(ONE_SYS, t.c)) return [ONE_SYS[t.c], 1, inStr(t.c, '€Ɛϵ') ? 'lookalike_cambrian:' + t.c : null];
        if (t.c === 'E') return ['Cm', 1, 'E_as_Cambrian'];
        return null;
      }
      describeHere() { const t = this.peek(); return "at '" + (t ? t.c : 'end') + "'"; }

      run() {
        const out = { input: this.text };
        const pre = this.parsePrefix();
        const genetic = pre[0], groups = pre[1], grel = pre[2];
        const ages = [], arels = [];
        let phase = null, local = null;
        if (this.sysAt(0) === null) {
          this.reasons.push('no system symbol found (' + this.describeHere() + ')');
          return this.finish(out, genetic, groups, grel, ages, arels, phase, local);
        }
        for (;;) {
          const si = this.sysAt(0);
          if (si === null) break;
          if (si[2]) this.warnings.push(si[2]);
          this.i += si[1];
          const comp = this.parseComponent(si[0]);
          ages.push(comp);
          if (comp.phase) phase = comp.phase;
          if (comp.local) local = comp.local;
          const t = this.peek();
          if (t !== null && inStr(t.c, '-+') && t.m === 'b' && this.sysAt(1)) {
            arels.push(t.c === '-' ? 'range' : 'and');
            this.i++;
            continue;
          }
          break;
        }
        if (this.peek() !== null) {
          this.reasons.push('unparsed remainder: ' + this.toks.slice(this.i).map((x) => x.c).join(''));
        }
        return this.finish(out, genetic, groups, grel, ages, arels, phase, local);
      }

      parsePrefix() {
        let genetic = [];
        const groups = [], grel = [];
        let j = 0, run = '';
        for (;;) {
          const t = this.peek(j);
          if (t !== null && t.m === 'b' && isLower(t.c) && !(j > 0 && t.sp)) { run += t.c; j++; } else break;
        }
        if (run) {
          const nxt = this.sysAt(j);
          if (nxt !== null && nxt[0] === 'Q') { this.i += j; genetic = this.splitGenetic(run); }
        }
        for (;;) {
          const g = this.parseGroup();
          if (g === null) break;
          groups.push(g);
          const t = this.peek();
          if (t !== null && t.c === '-' && t.m === 'b') {
            const t1 = this.peek(1);
            if (t1 !== null && this.isPrefixChar(1) && this.sysAt(1) === null) { grel.push('range'); this.i++; continue; }
          }
          break;
        }
        return [genetic, groups, grel];
      }
      isPrefixChar(k) {
        const t = this.peek(k);
        if (t === null || t.m !== 'b') return false;
        if (t.c === 'Γ') return true;
        if (GREEK.has(t.c)) return true;
        if (isLower(t.c)) return true;
        if (t.c === 'N' && this.sysAt(k + 1) !== null) return true;
        return false;
      }
      parseGroup() {
        const syms = [];
        for (;;) {
          const t = this.peek();
          if (t === null || t.m !== 'b') break;
          if (this.sysAt(0) !== null && !(t.c === 'N' && this.sysAt(1) !== null)) break;
          const c = t.c;
          if (c === 'N' && this.sysAt(1) !== null) { syms.push('Ν'); this.warnings.push('latin_N_as_Nu'); this.i++; }
          else if (GREEK.has(c)) { if (c === 'ρ') this.noteUnc('ρ'); syms.push(c); this.i++; }
          else if (c === '′') { this.i++; this.warnings.push('prime_ignored'); }
          else if (isLower(c)) {
            if (inStr(c, LATIN_MODS)) syms.push(c);
            else if (c === 'v') { syms.push('ν'); this.warnings.push('latin_v_as_nu'); }
            else if (c === 'y') { syms.push('γ'); this.warnings.push('latin_y_as_gamma'); }
            else { this.reasons.push("unknown prefix letter '" + c + "'"); syms.push('?' + c); }
            this.i++;
          } else break;
        }
        if (!syms.length) return null;
        return this.interpretGroup(syms);
      }
      splitGenetic(run) {
        const out = [];
        let i = 0;
        while (i < run.length) {
          let hit = false;
          for (const L of [3, 2, 1]) {
            const part = run.substr(i, L);
            if (part.length === L && has(gen, part)) { out.push(part); i += L; hit = true; break; }
          }
          if (!hit) { this.reasons.push("unknown Quaternary genetic letter '" + run[i] + "'"); out.push('?' + run[i]); i++; }
        }
        out.forEach((g) => { if (has(gen, g) && gen[g].unc) this.noteUnc('genetic:' + g); });
        return out;
      }
      interpretGroup(syms) {
        const mods = [];
        let eps = false, pi = false, mu = false;
        let bases = [];
        const unknown = [];
        syms.forEach((s) => {
          if (s === 'π') pi = true;
          else if (inStr(s, LATIN_MODS) && s.length === 1) mods.push(s);
          else if (s.charAt(0) === '?') unknown.push(s.slice(1));
          else if (s === 'μ') mu = true;
          else if (s === 'ε') eps = true;
          else bases.push(s);
        });
        const flags = [];
        if (!bases.length && eps && !mu) {
          bases = ['ε']; eps = false;
          flags.push('ε standing alone (alkaline rocks / nepheline syenite; uncertain)');
          this.noteUnc('ε alone');
        }
        if (!bases.length && mu && !eps) {
          bases = ['μ']; mu = false;
          flags.push('μ standing alone: monzonite (modern table) or micro- (older); uncertain');
          this.noteUnc('μ alone');
        }
        const units = [];
        let i = 0;
        while (i < bases.length) {
          let took = false;
          for (const L of [3, 2]) {
            const sl = bases.slice(i, i + L);
            const key = sl.join('');
            if (sl.length === L && (has(compound, key) || (has(compound, key + 'π') && pi))) {
              units.push(sl); i += L; took = true; break;
            }
          }
          if (!took) { units.push([bases[i]]); i++; }
        }
        const unresolved = [];
        if (units.length > 1) unresolved.push('symbols ' + units.map((u) => u.join('')).join('+') + ' are not a known compound');
        units.forEach((u) => u.forEach((sym) => {
          const r = rock[sym];
          if (r === undefined) unresolved.push('unknown rock symbol ' + sym);
          else if (r.unc) this.noteUnc(sym);
        }));
        if (!units.length && !pi) {
          if (unknown.length || mods.length) unresolved.push('modifier letters without a rock symbol: ' + mods.concat(unknown).join(''));
        }
        unknown.forEach((x) => unresolved.push('unknown letter ' + x));
        const g = { symbols: syms, mods: mods, eps: eps, pi: pi, mu: mu, units: units.map((u) => u.join('')), flags: flags, unresolved: unresolved };
        this.rockTexts(g);
        if (g.mu && bases.length) this.noteUnc('μ modifier');
        unresolved.forEach((u) => this.reasons.push(u));
        return g;
      }
      rockTexts(g) {
        if (!g.units.length && g.pi) {
          g.en_pl = 'hypabyssal / subvolcanic porphyritic intrusive rocks (undivided)';
          g.ru_pl = 'гипабиссальные / субвулканические порфировые породы (нерасчлененные)';
          g.kk_pl = 'жартылай терең / субвулкандық порфирлі жыныстар (бөлшектенбеген)';
          this.noteUnc('π alone');
          return;
        }
        const en = [], ru = [], kk = [];
        g.units.forEach((u) => {
          let comp = null, usedPi = false;
          if (g.pi && has(compound, u + 'π')) { comp = compound[u + 'π']; usedPi = true; }
          else if (g.mu && has(compound, u + 'μ')) { comp = compound[u + 'μ']; g.mu = false; }
          else if (has(compound, u)) comp = compound[u];
          let e, r, k;
          if (comp !== null) {
            if (comp.unc) this.noteUnc(comp.sym);
            e = comp.en_pl; r = comp.ru_pl; k = comp.kk_pl;
            if (g.pi && !usedPi) { e += ' (porphyritic)'; r += ' (порфировые)'; k += ' (порфирлі)'; }
          } else {
            const rk = has(rock, u) ? rock[u] : null;
            if (rk === null) { e = r = k = u; }
            else {
              const stemEn = rk.en.split(' (')[0].split(' or ')[0];
              const stemRu = rk.ru.split(' (')[0].split(' или ')[0];
              if (g.pi) {
                const acid = rk.group === 'acid' || rk.group === 'alkaline';
                e = stemEn + '-' + (acid ? 'porphyries' : 'porphyrites');
                r = stemRu + '-' + (acid ? 'порфиры' : 'порфириты');
                k = stemRu + '-' + (acid ? 'порфирлері' : 'порфириттері');
                g.flags.push('composed ' + u + ' + π (not in compound table)');
              } else { e = rk.en_pl; r = rk.ru_pl; k = rk.kk_pl; }
            }
          }
          en.push(e); ru.push(r); kk.push(k);
        });
        let e = en.join(' / '), r = ru.join(' / '), k = kk.join(' / ');
        const modEn = [], modRu = [], modKk = [];
        g.mods.forEach((m) => {
          if (m === 'p' && g.units.length && g.units[0] === 'γ') {
            e = e.replace('granites', 'plagiogranites'); r = r.replace('граниты', 'плагиограниты'); k = k.replace('граниттері', 'плагиограниттері');
            return;
          }
          modEn.push({ a: 'alaskitic', l: 'leucocratic', q: 'quartz', p: 'plagio-' }[m]);
          modRu.push({ a: 'аляскитовые', l: 'лейкократовые', q: 'кварцевые', p: 'плагио-' }[m]);
          modKk.push({ a: 'аляскитті', l: 'лейкократты', q: 'кварцты', p: 'плагио-' }[m]);
        });
        if (g.eps) { modEn.push('alkaline'); modRu.push('щелочные'); modKk.push('сілтілі'); }
        if (g.mu) { modEn.push('fine-grained hypabyssal (micro-)'); modRu.push('мелкозернистые гипабиссальные (микро-)'); modKk.push('ұсақ түйіршікті жартылай терең (микро-)'); }
        g.en_pl = modEn.concat([e]).join(' ');
        g.ru_pl = modRu.concat([r]).join(' ');
        g.kk_pl = modKk.concat([k]).join(' ');
      }

      parseComponent(sid) {
        const S = sysById[sid];
        const comp = { system: sid, series: [], series_rel: null, sup: [], sup_rel: null, roman: null, phase: null, stages: [], substage: [], substage_rel: null, local: null, questionable: false };
        this.eatQ();
        let r = this.readDigitRun(['sub', 'b']);
        if (r[0].length) { comp.series = r[0]; comp.series_rel = r[1]; }
        this.eatQ();
        r = this.readDigitRun(['sup']);
        if (r[0].length) { comp.sup = r[0]; comp.sup_rel = r[1]; }
        this.eatQ();
        const t = this.peek();
        if (t !== null && t.m === 'b' && inStr(t.c, 'IV')) {
          const rr = this.readRoman();
          if (rr[0].length) {
            if (sid === 'Q' && !comp.series.length) { comp.series = rr[0]; comp.series_rel = rr[1]; comp.roman = true; }
            else { comp.phase = rr[0]; comp.phase_rel = rr[1]; }
          }
        }
        this.eatQ();
        comp.series.forEach((x) => {
          if (x < 1 || x > S.n_series) this.reasons.push('series ' + x + ' out of range for ' + sid + ' (max ' + S.n_series + ')');
        });
        comp.sup.forEach((x) => {
          if (x < 1 || x > 3) this.reasons.push('sub-series part ' + x + ' out of range (1-3)');
        });
        if (sid === 'Pz' || sid === 'R' || sid === 'Sn' || S.uncertain) this.noteUnc('system:' + sid);
        if (!comp.phase) this.parseTail(comp, sid);
        this.eatQ();
        comp.questionable = this.questionable;
        return comp;
      }
      readDigitRun(modes) {
        const t = this.peek();
        if (t === null || !isDigit(t.c) || modes.indexOf(t.m) < 0) return [[], null];
        const out = [parseInt(t.c, 10)];
        this.i++;
        let rel = null;
        const t2 = this.peek(), t1 = this.peek(1);
        if (t2 !== null && inStr(t2.c, '-+') && (modes.indexOf(t2.m) >= 0 || t2.m === 'b') && t1 !== null && isDigit(t1.c) && modes.indexOf(t1.m) >= 0) {
          rel = t2.c === '-' ? 'range' : 'and';
          out.push(parseInt(t1.c, 10));
          this.i += 2;
        }
        return [out, rel];
      }
      readRoman() {
        let s = '';
        for (;;) {
          const t = this.peek();
          if (t !== null && t.m === 'b' && inStr(t.c, 'IV') && !(s && t.sp)) { s += t.c; this.i++; } else break;
        }
        if (!has(ROMAN, s)) { this.reasons.push('bad Roman numeral ' + s); return [[], null]; }
        const out = [ROMAN[s]];
        let rel = null;
        const t = this.peek(), t1 = this.peek(1);
        if (t !== null && t.c === '-' && t.m === 'b' && t1 !== null && t1.m === 'b' && inStr(t1.c, 'IV')) {
          this.i++;
          let s2 = '';
          for (;;) {
            const u = this.peek();
            if (u !== null && u.m === 'b' && inStr(u.c, 'IV') && !(s2 && u.sp)) { s2 += u.c; this.i++; } else break;
          }
          if (has(ROMAN, s2)) { out.push(ROMAN[s2]); rel = 'range'; }
        }
        return [out, rel];
      }
      readLetters(allowUpperSingle) {
        let s = '';
        for (;;) {
          const t = this.peek();
          if (t === null || t.m !== 'b' || (s && t.sp)) break;
          const c = t.c;
          if (isLower(c)) s += c;
          else if (has(GRK2LAT_TAIL, c)) { s += GRK2LAT_TAIL[c]; this.warnings.push('greek_lookalike_in_tail:' + c + '>' + GRK2LAT_TAIL[c]); }
          else if (allowUpperSingle && !s && isUpper(c)) {
            s = c.toLowerCase(); this.i++; this.warnings.push('uppercase_stage_letter:' + c); return s;
          } else break;
          this.i++;
        }
        return s;
      }
      stageOk(sid, abbr, series) {
        const st = stages[sid] && has(stages[sid], abbr) ? stages[sid][abbr] : null;
        if (st === null) return null;
        if (series.length && st.series && st.series.length) {
          if (!series.some((x) => st.series.indexOf(x) >= 0)) return 'mismatch';
        }
        return st;
      }
      readSub() {
        const t = this.peek();
        if (t !== null && isDigit(t.c) && (t.m === 'sub' || (t.m === 'b' && !t.sp))) {
          const modes = ['sub', 'b'];
          const out = [parseInt(t.c, 10)];
          this.i++;
          let rel = null;
          const t2 = this.peek(), t1 = this.peek(1);
          if (t2 !== null && inStr(t2.c, '-+') && modes.indexOf(t2.m) >= 0 && t1 !== null && isDigit(t1.c) && modes.indexOf(t1.m) >= 0) {
            rel = t2.c === '-' ? 'range' : 'and';
            out.push(parseInt(t1.c, 10));
            this.i += 2;
          }
          return [out, rel];
        }
        return [[], null];
      }
      parseTail(comp, sid) {
        const series = comp.series.slice();
        let run = this.readLetters(false);
        if (!run) {
          const t = this.peek();
          if (t !== null && t.m === 'b' && isUpper(t.c) && !inStr(t.c, 'IV') && !t.sp) {
            const so = this.stageOk(sid, t.c.toLowerCase(), series);
            if (so !== null && so !== 'mismatch') run = this.readLetters(true);
          }
        }
        if (!run) return;
        const st = this.stageOk(sid, run, series);
        if (st !== null && st !== 'mismatch') {
          const entry = { abbr: run, sub: [], sub_rel: null };
          comp.stages.push(entry);
          if (!st.seen_on_pilot) this.noteUnc('stage:' + sid + ':' + run);
          let rs = this.readSub();
          entry.sub = rs[0]; entry.sub_rel = rs[1];
          for (;;) {
            const t = this.peek(), t1 = this.peek(1);
            if (t !== null && t.c === '-' && t.m === 'b' && t1 !== null && t1.m === 'b' && isLower(t1.c) && comp.stages.length < 2) {
              const save = this.i;
              this.i++;
              const run2 = this.readLetters(false);
              const useSeries = Array.from(new Set(series.concat(st.series || [])));
              const st2 = this.stageOk(sid, run2, useSeries);
              if (st2 !== null && st2 !== 'mismatch') {
                const e2 = { abbr: run2, sub: [], sub_rel: null };
                comp.stages.push(e2);
                if (!st2.seen_on_pilot) this.noteUnc('stage:' + sid + ':' + run2);
                rs = this.readSub();
                e2.sub = rs[0]; e2.sub_rel = rs[1];
                continue;
              }
              this.i = save;
            }
            break;
          }
          this.eatQ();
          const run3 = this.readLetters(false);
          if (run3) {
            const loc = { abbr: run3, sub: [], note: null };
            loc.sub = this.readSub()[0];
            comp.local = loc;
          }
          return;
        }
        const loc = { abbr: run, sub: [], note: null };
        if (st === 'mismatch') loc.note = 'same letters as the ' + sid + " stage '" + run + "' but the series does not match, so read as a local suite";
        loc.sub = this.readSub()[0];
        comp.local = loc;
      }

      finish(out, genetic, groups, grel, ages, arels, phase, local) {
        out.warnings = this.warnings;
        out.genetic = genetic;
        out.rock_groups = groups.map((g) => ({ symbols: g.symbols.join(''), units: g.units, mods: g.mods, eps: g.eps, pi: g.pi, mu: g.mu, flags: g.flags, en: g.en_pl, ru: g.ru_pl, kk: g.kk_pl }));
        out.rock_relation = grel;
        out.ages = ages;
        out.age_relation = arels;
        out.phase = phase;
        out.questionable = this.questionable;
        out.local_suite = local;
        out.uncertain_used = this.unc;
        out.reasons = this.reasons;
        if (!ages.length) {
          out.status = groups.length && !groups.some((g) => g.unresolved.length) ? 'partial' : 'failed';
          if (groups.length && out.status === 'partial' && !this.reasons.length) this.reasons.push('rock letters decoded but no age symbol found');
        } else if (this.reasons.length) out.status = 'partial';
        else out.status = 'full';
        out.normalized = this.render(genetic, groups, ages, arels);
        fillTexts(out, genetic, groups, ages, arels, phase, this.questionable);
        return out;
      }
      render(genetic, groups, ages, arels) {
        let s = genetic.join('');
        groups.forEach((g, gi) => { if (gi) s += '-'; s += g.symbols.join(''); });
        ages.forEach((a, ai) => {
          if (ai) s += arels[ai - 1] === 'and' ? '+' : '-';
          s += a.system;
          s += a.roman ? romanStr(a.series) : dstr(a.series, a.series_rel, 'sub');
          if (a.sup.length) s += dstr(a.sup, a.sup_rel, 'sup');
          if (a.phase) s += romanStr(a.phase);
          a.stages.forEach((st, si) => { s += (si ? '-' : '') + st.abbr + dstr(st.sub, st.sub_rel, 'sub'); });
          if (a.local) s += ' ' + a.local.abbr + dstr(a.local.sub, null, 'sub');
        });
        if (this.questionable) s += '?';
        return s;
      }
    }

    // ---------------------------------------------------------------- texts
    const sysd = (sid) => sysById[sid];
    const stageRec = (sid, abbr) => { const o = stages[sid]; return o && has(o, abbr) ? o[abbr] : null; };
    function sw(n, early, lang, gender, genit) {
      const g = SG[String(n)];
      if (lang === 'en') return early ? g.en_early : g.en;
      if (lang === 'ru') return g['ru_' + gender + (genit ? '_gen' : '')];
      return early ? g.kk_early : g.kk;
    }
    const PART = { en: { 1: 'lower', 2: 'middle', 3: 'upper' }, ru: { 1: 'нижняя', 2: 'средняя', 3: 'верхняя' }, kk: { 1: 'төменгі', 2: 'ортаңғы', 3: 'жоғарғы' } };
    function join(a, rel, lang) {
      if (rel === 'and') return a[0] + { en: ' and ', ru: ' и ', kk: ' және ' }[lang] + a[1];
      return a[0] + { en: ' to ', ru: '-', kk: '-' }[lang] + a[1];
    }
    function compAge(c, lang, early, genit) {
      const sid = c.system, S = sysd(sid);
      const ser = c.series, rel = c.series_rel, srel = c.sup_rel;
      let sup = c.sup;
      const gender = S.ru_gender;
      let out = '';
      const maxn = sid === 'Q' ? 4 : S.n_series;
      if (ser.some((x) => x < 1 || x > maxn)) {
        let base = { en: S.en.split(' (')[0], ru: genit ? S.ru_gen : S.ru, kk: S.kk.toLowerCase() }[lang];
        if (sid === 'Q') base = { en: 'Quaternary', ru: 'четвертичные', kk: 'төрттік' }[lang];
        return base + { en: ' (series %s)', ru: ' (серия %s)', kk: ' (қатар %s)' }[lang].replace('%s', ser.join('-'));
      }
      if (sup.some((x) => x < 1 || x > 3)) sup = [];
      if (sid === 'Q') {
        const q = D.q_series;
        if (!ser.length) return { en: 'Quaternary', ru: 'четвертичные', kk: 'төрттік' }[lang];
        const qw = (n) => {
          if (lang === 'en') return { 1: 'Lower', 2: 'Middle', 3: 'Upper', 4: 'Recent' }[n];
          if (lang === 'ru') return q[String(n)].ru_adj;
          return q[String(n)].kk.replace(' төрттік', '');
        };
        if (ser.length === 1) {
          const n = ser[0];
          if (lang === 'en') out = n === 4 ? 'Recent (Holocene)' : qw(n) + ' Quaternary';
          else if (lang === 'ru') out = qw(n);
          else out = q[String(n)].kk;
        } else if (lang === 'kk') {
          const w = ser.map((x) => q[String(x)].kk.replace(' төрттік', ''));
          const conn = rel === 'and' ? ' және ' : '-';
          if (ser[1] === 4) out = w[0] + ' төрттік' + (conn !== '-' ? conn : ' - ') + w[1];
          else out = w[0] + conn + w[1] + ' төрттік';
        } else {
          out = join([qw(ser[0]), qw(ser[1])], rel, lang);
          if (lang === 'en') out += ' Quaternary';
        }
        return out;
      }
      const name = lang === 'en' ? S.en.split(' (')[0] : lang === 'ru' ? (genit ? S.ru_gen : S.ru) : S.kk.toLowerCase();
      const eps = D.epochs[sid];
      if (!ser.length) return name;
      if (eps) {
        const epn = (n) => {
          const e = eps[String(n)];
          if (lang === 'en') return e.en;
          if (lang === 'ru') return genit ? e.ru_gen : e.ru;
          return e.kk.toLowerCase();
        };
        if (sup.length && ser.length === 1) {
          if (sup.length === 1) return sw(sup[0], early, lang, 'm', genit) + ' ' + epn(ser[0]);
          return join(sup.map((x) => sw(x, early, lang, 'm', genit)), srel, lang) + ' ' + epn(ser[0]);
        }
        if (ser.length === 1) return epn(ser[0]);
        return join([epn(ser[0]), epn(ser[1])], rel, lang);
      }
      const sword = (n) => {
        const m = S.n_series === 2 && (n === 1 || n === 2) ? { 1: 1, 2: 3 }[n] : n;
        return sw(Math.min(Math.max(m, 1), 3), early, lang, gender, genit);
      };
      if (ser.length === 1) out = sword(ser[0]) + ' ' + name;
      else out = join([sword(ser[0]), sword(ser[1])], rel, lang) + ' ' + name;
      if (sup.length) {
        const pw = sup.length === 1 ? PART[lang][sup[0]] : join([PART[lang][sup[0]], PART[lang][sup[1]]], srel, lang);
        out += { en: ' (%s part)', ru: ' (%s часть)', kk: ' (%s бөлігі)' }[lang].replace('%s', pw);
      }
      return out;
    }
    const SUBW = { en: { 1: 'lower', 2: 'middle', 3: 'upper' }, ru: { 1: 'нижний', 2: 'средний', 3: 'верхний' }, kk: { 1: 'төменгі', 2: 'ортаңғы', 3: 'жоғарғы' } };
    function stageText(c, lang) {
      if (!c.stages.length) return '';
      const sid = c.system;
      const names = [], subs = [];
      c.stages.forEach((st) => {
        const rec = stageRec(sid, st.abbr);
        let nm = rec[lang];
        if (c.stages.length === 2 && st.sub.length) {
          const n = st.sub[0];
          const nsub = rec.n_sub;
          let m = n;
          if (nsub === 2) m = ({ 1: 1, 2: 3 })[n] !== undefined ? ({ 1: 1, 2: 3 })[n] : n;
          if ((nsub === 2 || nsub === 3) && (m === 1 || m === 2 || m === 3)) {
            if (lang === 'en') nm = { 1: 'lower', 2: 'middle', 3: 'upper' }[m] + ' ' + nm;
            else if (lang === 'ru') nm = { 1: 'нижне', 2: 'средне', 3: 'верхне' }[m] + nm;
            else nm = { 1: 'төменгі', 2: 'ортаңғы', 3: 'жоғарғы' }[m] + ' ' + nm;
          } else {
            nm += { en: ' (substage %d)', ru: ' (подъярус %d)', kk: ' (қосымша ярус %d)' }[lang].replace('%d', n);
          }
        }
        names.push(nm);
        subs.push([rec, st]);
      });
      let s;
      if (lang === 'en') s = names.join(' to ') + (names.length > 1 ? ' stages' : ' stage');
      else if (lang === 'ru') s = names.join(' - ') + (names.length > 1 ? ' ярусы' : ' ярус');
      else s = names.length > 1 ? names.join(' - ') + ' ярустары' : names[0] + ' ярусы';
      if (c.stages.length === 1 && c.stages[0].sub.length) {
        const rec = subs[0][0], st = subs[0][1];
        const sub = st.sub, nsub = rec.n_sub;
        const known = nsub === 2 || nsub === 3;
        const sword = (n) => {
          let m = null;
          if (nsub === 2) m = ({ 1: 1, 2: 3 })[n] !== undefined ? ({ 1: 1, 2: 3 })[n] : null;
          else if (nsub === 3) m = (n === 1 || n === 2 || n === 3) ? n : null;
          if (m === null) return sub.length === 1 ? { en: 'substage %d', ru: 'подъярус %d', kk: 'қосымша ярус %d' }[lang].replace('%d', n) : String(n);
          return SUBW[lang][m];
        };
        if (sub.length === 1) {
          const w = sword(sub[0]);
          s += ', ' + (known ? w + { en: ' substage', ru: ' подъярус', kk: ' қосымша ярус' }[lang] : w);
        } else {
          const j = join([sword(sub[0]), sword(sub[1])], st.sub_rel, lang);
          if (known) s += ', ' + j + { en: ' substages', ru: ' подъярусы', kk: ' қосымша ярустар' }[lang];
          else s += ', ' + { en: 'substages ', ru: 'подъярусы ', kk: 'қосымша ярустар ' }[lang] + j;
        }
      }
      return s;
    }
    function agePhrase(ages, arels, lang, early, genit, withStage) {
      const parts = ages.map((c) => {
        let p = compAge(c, lang, early, genit);
        if (withStage && c.stages.length) p += ' (' + stageText(c, lang) + ')';
        return p;
      });
      let s = parts[0];
      for (let k = 1; k < parts.length; k++) {
        const and = arels[k - 1] === 'and';
        s += (and ? (lang === 'ru' ? ' и ' : lang === 'en' ? ' and ' : ' және ') : ' - ') + parts[k];
      }
      return s;
    }
    function qStages(ages, lang) {
      let out = '';
      ages.forEach((c) => { if (c.stages.length) out += ' (' + stageText(c, lang) + ')'; });
      return out;
    }
    function colour(c) {
      const sid = c.system;
      if (c.series.length) {
        const n = c.series[0];
        if (sid === 'Q' && D.q_series[String(n)]) return D.q_series[String(n)].ics;
        if (D.epochs[sid] && D.epochs[sid][String(n)]) return D.epochs[sid][String(n)].colour_ics;
      }
      return sysd(sid).colour_ics;
    }
    function fillTexts(out, genetic, groups, ages, arels, phase, questionable) {
      if (!ages.length) {
        out.en = out.ru = out.kk = '';
        if (groups.length) {
          const sep = { en: ' to ', ru: ' - ', kk: ' - ' };
          ['en', 'ru', 'kk'].forEach((lang) => {
            out[lang] = cap(groups.map((g) => g[lang + '_pl']).join(sep[lang]));
          });
          out.note_no_age = 'rock letters only, no age symbol found';
        }
        return;
      }
      const hasRock = groups.length > 0;
      const genRecs = genetic.map((g) => (has(gen, g) ? gen[g] : { en: g, ru: g, kk: g }));
      ['en', 'ru', 'kk'].forEach((lang) => {
        const early = hasRock;
        const genit = hasRock && lang === 'ru';
        const age = agePhrase(ages, arels, lang, early, genit, !hasRock);
        const isQ = ages[0].system === 'Q';
        let s;
        if (hasRock) {
          const rj = { en: ' to ', ru: ' - ', kk: ' - ' }[lang];
          let rock = groups[0][lang + '_pl'];
          for (let gi = 1; gi < groups.length; gi++) rock += rj + groups[gi][lang + '_pl'];
          if (lang === 'en') s = age + ' ' + rock;
          else if (lang === 'ru') s = cap(rock) + ' ' + age;
          else s = age + ' ' + rock;
        } else if (isQ) {
          if (lang === 'en') {
            const g = genRecs.map((x) => x.en).join(' and ');
            if (g) s = ages[0].series.length ? cap(g) + ' deposits, ' + age : cap(g) + ' Quaternary deposits';
            else s = ages[0].series.length ? age : 'Quaternary (undivided)';
          } else if (lang === 'ru') {
            const g = genRecs.map((x) => x.ru).join(' и ');
            const age0 = agePhrase(ages, arels, lang, early, genit, false);
            const base = ages[0].series.length ? age0 + ' отложения' : 'четвертичные отложения';
            s = cap((g ? g + ' ' : '') + base) + qStages(ages, lang);
          } else {
            const g = genRecs.map((x) => x.kk).join(' және ');
            const age0 = agePhrase(ages, arels, lang, early, genit, false);
            const base = ages[0].series.length ? age0 + ' шөгінділері' : 'төрттік шөгінділер';
            s = cap((g ? g + ' ' : '') + base) + qStages(ages, lang);
          }
        } else s = age;
        if (hasRock) s += qStages(ages, lang);
        if (phase && hasRock) {
          const r = romanStr(phase);
          s += { en: ', phase ' + r, ru: ', ' + r + ' фаза', kk: ', ' + r + ' фаза' }[lang];
        }
        if (questionable) s += { en: ' (age questionable)', ru: ' (возраст предположительный)', kk: ' (жасы күмәнді)' }[lang];
        out[lang] = cap(s);
        out['age_' + lang] = cap(age);
      });
      if (ages[0].system === 'Q' && ages[0].series.length && ages[0].series.every((x) => x >= 1 && x <= 4)) {
        const ser = ages[0].series;
        const names = { 1: 'Lower Pleistocene', 2: 'Middle Pleistocene', 3: 'Upper Pleistocene', 4: 'Holocene' };
        out.age_en_epochs = ser.length === 1 ? names[ser[0]] : names[ser[0]] + (ages[0].series_rel !== 'and' ? ' to ' : ' and ') + names[ser[1]];
      }
      out.colour_ics = colour(ages[0]);
      out.colour_ics_end = ages.length > 1 ? colour(ages[ages.length - 1]) : null;
      out.system_ids = ages.map((a) => a.system);
    }

    return { decode: (text) => new Parse(text).run(), dictionary: D };
  }

  return { createDecoder: createDecoder, tokenize: tokenize };
});
