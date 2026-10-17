import * as C from './calc.js';
import { load, save, uid, newRecipe, newLine, sampleRolls, sampleLunch } from './storage.js';
import { initPro, isPro, onProChange, buyPro, restorePro, proState, storeLink } from './pro.js';
import { CONFIG } from './config.js';

const state = load();
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const main = $('#main');
const side = $('#side');

const activeRecipe = () => state.recipes.find((r) => r.id === state.activeId) || null;
const persist = (now = false) => save(state, now);
const touch = (r) => { r.updatedAt = new Date().toISOString(); persist(); };

const nf = (d) => new Intl.NumberFormat(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
const trimNum = (n) => (Number.isFinite(+n) ? String(Math.round(+n * 100) / 100) : '');
function money(n) {
  if (!Number.isFinite(n)) return '–';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: state.settings.currency }).format(n); }
  catch { return `$${n.toFixed(2)}`; }
}
function currencySymbol() {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: state.settings.currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((x) => x.type === 'currency').value;
  } catch { return '$'; }
}

const ICON = {
  plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
  x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  lock: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>',
};

function pricedLine(line) {
  const pantry = line.pantryId && state.settings.pantry.find((p) => p.id === line.pantryId);
  if (!pantry) return line;
  return {
    ...line,
    name: line.name || pantry.name,
    price: pantry.price,
    packQty: pantry.packQty,
    packUnit: pantry.packUnit || line.packUnit,
    usablePct: pantry.usablePct || '',
    gramsPerCup: line.gramsPerCup || pantry.gramsPerCup || '',
  };
}
function viewRecipe(recipe) {
  return { ...recipe, lines: (recipe.lines || []).map(pricedLine) };
}
function detach(line) {
  if (!line.pantryId) return;
  const pantry = state.settings.pantry.find((p) => p.id === line.pantryId);
  if (pantry) {
    line.price = pantry.price;
    line.packQty = pantry.packQty;
    line.packUnit = pantry.packUnit || line.packUnit;
    line.usablePct = pantry.usablePct || '';
    if (!line.gramsPerCup) line.gramsPerCup = pantry.gramsPerCup || '';
    if (!line.name) line.name = pantry.name;
  }
  line.pantryId = '';
}

function field(o) {
  const id = o.id || `f-${o.path.replace(/[^a-z0-9]/gi, '-')}`;
  const label = `<span class="label">${esc(o.label)}${o.locked ? ` <span class="pro-tag">${ICON.lock}Pro</span>` : ''}</span>`;
  return `<label class="field${o.wide ? ' wide' : ''}" for="${id}">${label}
    <span class="control"><input id="${id}" data-path="${o.path}" value="${esc(o.value)}" inputmode="${o.inputmode || 'decimal'}" placeholder="${esc(o.placeholder || '')}"
      autocomplete="off" spellcheck="false"${o.kind ? ` data-kind="${o.kind}"` : ''}>${o.suffix ? `<span class="suffix">${esc(o.suffix)}</span>` : ''}</span>
    ${o.hint ? `<span class="hint">${esc(o.hint)}</span>` : ''}</label>`;
}

function unitOptions(selected, units) {
  return C.unitList(units).map((key) => {
    const u = C.UNITS[key];
    return `<option value="${esc(key)}"${key === selected ? ' selected' : ''}>${esc(u.label)}</option>`;
  }).join('');
}

function needsCup(line) {
  const a = C.parseUnit(line.unit);
  const b = C.parseUnit(line.packUnit);
  if (!a || !b) return false;
  if (C.UNITS[a].family === 'count' || C.UNITS[b].family === 'count') return false;
  return C.UNITS[a].family !== C.UNITS[b].family;
}

function render() {
  renderBar();
  const recipe = activeRecipe();
  if (!recipe) renderWelcome();
  else renderRecipe(recipe);
}

function renderBar() {
  const sel = $('#recipeSelect');
  const recipes = [...state.recipes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  sel.innerHTML = recipes.length
    ? recipes.map((r) => `<option value="${r.id}"${r.id === state.activeId ? ' selected' : ''}>${esc(r.name || 'Untitled recipe')}</option>`).join('')
    : '<option>No recipes yet</option>';
  sel.disabled = !recipes.length;
  $('#proBadge').hidden = !isPro();
  $('#getPro').hidden = isPro();
}

function renderWelcome() {
  side.innerHTML = '';
  main.innerHTML = `<div class="welcome">
    <h1>What should one serving cost?</h1>
    <p>Price the package you bought, the time, and the box. Batchbook then tells you the menu price that hits your food-cost target.</p>
    <div class="row">
      <button class="btn primary" data-action="sample">Start with cinnamon rolls</button>
      <button class="btn" data-action="lunch">Try boxed lunches</button>
      <button class="btn" data-action="new-recipe">${ICON.plus}New recipe</button>
    </div>
    <p class="fine">Recipes stay on this PC. Food-cost percent is ingredients only. Labour is counted separately, so you can see when a target price would lose money.</p>
  </div>`;
}

function renderRecipe(recipe) {
  const view = viewRecipe(recipe);
  const units = recipe.units === 'metric' ? 'metric' : 'us';
  const sym = currencySymbol();
  const cards = isPro() ? state.settings.cards : [];
  const pantry = state.settings.pantry;
  main.innerHTML = `
    <div class="job-head">
      <label class="sr-only" for="f-r-name">Recipe name</label>
      <input id="f-r-name" class="recipe-name" data-path="r.name" value="${esc(recipe.name)}" placeholder="Recipe name" autocomplete="off">
      <div class="grid">
        ${field({ path: 'r.menu', label: 'Where it sells', value: recipe.menu, inputmode: 'text', placeholder: 'Saturday market' })}
        ${field({ path: 'r.servings', label: 'Servings', value: recipe.servings, kind: 'servings', placeholder: '12', hint: 'How many this batch makes.' })}
        ${field({ path: 'r.sellPrice', label: 'Your menu price', value: recipe.sellPrice, suffix: `${sym} each`, kind: 'number', hint: 'What you charge now. Blank if you are still deciding.' })}
        ${field({ path: 'r.targetFoodCostPct', label: 'Food-cost target', value: recipe.targetFoodCostPct, suffix: '%', kind: 'target', hint: 'Ingredient cost divided by the menu price. 28–32% is a common kitchen target.' })}
      </div>
      <div class="job-actions">
        <button class="btn quiet" data-action="duplicate">Duplicate recipe</button>
        <button class="btn quiet danger" data-action="delete">Delete recipe</button>
      </div>
    </div>

    <section class="block" aria-labelledby="h-ing">
      <div class="block-head"><h2 id="h-ing">Ingredients</h2>
        <p class="block-note">Recipe amount on the left. What you paid for the pack on the right. Usable is how much of the pack you can plate.</p></div>
      <div class="ing-head" aria-hidden="true"><span>Qty</span><span>Unit</span><span>Pack price</span><span>Pack size</span><span>Unit</span><span>Usable</span><span></span></div>
      <div class="ings">
        ${view.lines.map((line) => `<div class="ing" data-line="${esc(line.id)}">
          <input class="ing-name" data-path="l.${line.id}.name" value="${esc(line.name)}" placeholder="Flour, butter, eggs" aria-label="Ingredient" autocomplete="off">
          <div class="ing-controls">
            <input data-path="l.${line.id}.qty" data-kind="qty" value="${esc(line.qty)}" inputmode="decimal" aria-label="Recipe quantity" placeholder="Qty" autocomplete="off">
            <select data-path="l.${line.id}.unit" aria-label="Recipe unit">${unitOptions(line.unit, units)}</select>
            <input data-path="l.${line.id}.price" data-kind="number" value="${esc(line.price)}" inputmode="decimal" aria-label="Pack price" placeholder="0.00" autocomplete="off">
            <input data-path="l.${line.id}.packQty" data-kind="number" value="${esc(line.packQty)}" inputmode="decimal" aria-label="Pack size" placeholder="Size" autocomplete="off">
            <select data-path="l.${line.id}.packUnit" aria-label="Pack unit">${unitOptions(line.packUnit, units)}</select>
            <input data-path="l.${line.id}.usablePct" data-kind="usable" value="${esc(line.usablePct)}" inputmode="decimal" aria-label="Usable percent" placeholder="100" autocomplete="off">
            <button class="icon-btn" data-action="remove-line" data-id="${line.id}" aria-label="Remove ingredient">${ICON.x}</button>
          </div>
          <div class="ing-more">
            <label class="gcup"${needsCup(line) ? '' : ' hidden'}>Grams per cup
              <input data-path="l.${line.id}.gramsPerCup" data-kind="number" value="${esc(line.gramsPerCup)}" inputmode="decimal" placeholder="auto" aria-label="Grams per cup" autocomplete="off">
            </label>
            <span class="ing-meta"></span>
            <span class="ing-cost"></span>
          </div>
        </div>`).join('')}
      </div>
      <button class="btn link" data-action="add-line">${ICON.plus}Add an ingredient</button>
      <p class="fine">A cup priced from a bag uses the King Arthur Baking cup weights. Ground cinnamon uses 7.8 g per tablespoon (USDA). Type grams per cup when yours differs. Kosher salt is not guessed.</p>
      <div class="card-row">
        ${pantry.length ? `<label class="field"><span class="label">Price book</span>
          <select id="pantryPick">
            <option value="">Add an ingredient from the price book</option>
            ${pantry.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(money(+p.price || 0))}</option>`).join('')}
          </select></label>` : ''}
        <button class="btn" data-action="save-book">Save prices to the price book</button>
        <button class="btn" data-action="open-pantry">Edit price book</button>
      </div>
    </section>

    <section class="block" aria-labelledby="h-labor">
      <div class="block-head"><h2 id="h-labor">Labour, box and overhead</h2>
        <p class="block-note">The hourly rate is what the kitchen costs you, not a menu markup. Packaging is per serving.</p></div>
      <div class="seg" role="group" aria-label="Shop preset">
        ${Object.entries(C.PRESETS).map(([id, p]) => `<button type="button" data-action="preset" data-preset="${id}" aria-pressed="${recipe.preset === id}">${esc(p.label)} · ${esc(money(+p.rate))}/h</button>`).join('')}
      </div>
      <div class="grid">
        ${field({ path: 'r.laborMinutes', label: 'Labour', value: recipe.laborMinutes, suffix: 'min', kind: 'number' })}
        ${field({ path: 'r.laborRate', label: 'Labour rate', value: recipe.laborRate, suffix: `${sym}/h`, kind: 'number' })}
        ${field({ path: 'r.packaging', label: 'Packaging', value: recipe.packaging, suffix: `${sym} each`, kind: 'number', hint: 'Box, napkin, label. Added once per serving.' })}
        ${field({ path: 'r.overheadPct', label: 'Overhead', value: recipe.overheadPct, suffix: '%', kind: 'number', hint: 'Percent of ingredients, labour and packaging.' })}
        ${field({ path: 'r.taxPct', label: 'Sales tax', value: recipe.taxPct, suffix: '%', kind: 'number', hint: 'Added to your menu price. Left out of food cost.' })}
      </div>
      <div class="card-row">
        ${cards.length ? `<label class="field"><span class="label">Saved shop preset</span>
          <select id="cardPick">
            <option value="">Rates on this recipe</option>
            ${cards.map((c) => `<option value="${c.id}"${c.id === recipe.cardId ? ' selected' : ''}>${esc(c.name)} · ${esc(money(+c.rate))}/h</option>`).join('')}
          </select></label>` : ''}
        <button class="btn" data-action="save-card">${isPro() ? '' : ICON.lock}Save shop preset</button>
        ${recipe.cardId ? `<button class="btn quiet danger" data-action="delete-card">Delete this preset</button>` : ''}
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Notes on the card</h2></div>
      <label class="sr-only" for="f-r-notes">Notes</label>
      <textarea id="f-r-notes" data-path="r.notes" rows="3" placeholder="What's included, what you still buy day-of">${esc(recipe.notes)}</textarea>
    </section>`;
  updateQuote();
  validate(main);
}

function heroOf(r) {
  if (r.sellPrice > 0 && r.foodCostPct != null) {
    const over = r.targetPct > 0 && r.foodCostPct > r.targetPct + 0.05;
    return {
      label: 'Food cost',
      big: C.formatPct(r.foodCostPct),
      klass: over ? 'bad' : 'good',
      sub: `${money(r.profitPerServing)} profit per serving at ${money(r.sellPrice)}`,
      mode: 'food',
    };
  }
  if (r.suggested != null) {
    return { label: 'Charge this', big: money(r.suggested), klass: '', sub: `per serving to hit ${trimNum(r.targetPct)}% food cost`, mode: 'suggest' };
  }
  if (r.perServing != null) {
    return { label: 'Each serving costs', big: money(r.perServing), klass: '', sub: `${money(r.batch)} for the batch`, mode: 'plate' };
  }
  return { label: 'Batch cost', big: money(r.batch), klass: '', sub: 'Add servings to split it across plates', mode: 'batch' };
}

function updateQuote() {
  const recipe = activeRecipe();
  if (!recipe) { side.innerHTML = ''; return; }
  const view = viewRecipe(recipe);
  const result = C.costRecipe(view);
  view.lines.forEach((line, i) => {
    const priced = result.lines[i];
    const row = main.querySelector(`.ing[data-line="${line.id}"]`);
    if (!row) return;
    const meta = row.querySelector('.ing-meta');
    meta.textContent = priced.warning || priced.note || '';
    meta.classList.toggle('warn', Boolean(priced.warning));
    row.querySelector('.ing-cost').textContent = priced.cost ? money(priced.cost) : '';
    const cup = row.querySelector('.gcup');
    if (cup) cup.hidden = !needsCup(line);
  });
  const hero = heroOf(result);
  const rows = [['Ingredients', result.ingredients]];
  if (result.labor > 0) rows.push([`Labour · ${C.formatMinutes(result.minutes)}`, result.labor]);
  if (result.packaging > 0) rows.push(['Packaging', result.packaging]);
  if (result.overhead > 0) rows.push([`Overhead ${trimNum(recipe.overheadPct)}%`, result.overhead]);
  const usedChart = result.lines.some((line) => line.note && line.note.includes('g/cup') && !line.note.includes('your cup'));
  side.innerHTML = `<div class="price-card">
    <div class="stripe" aria-hidden="true"></div>
    <div class="price-body">
      <p class="price-label">${esc(hero.label)}</p>
      <p class="price-big${hero.klass ? ` ${hero.klass}` : ''}">${esc(hero.big)}</p>
      <p class="price-sub">${esc(hero.sub)}</p>
      <dl class="breakdown">
        ${rows.map(([label, amount]) => `<div><dt>${esc(label)}</dt><dd>${money(amount)}</dd></div>`).join('')}
        <div class="sum"><dt>Plate cost</dt><dd>${money(result.batch)}</dd></div>
        ${result.perServing != null ? `<div class="strong"><dt>Each serving</dt><dd>${money(result.perServing)}</dd></div>` : ''}
        ${result.suggested != null && hero.mode !== 'suggest' ? `<div><dt>${esc(trimNum(result.targetPct))}% food cost</dt><dd>${money(result.suggested)}</dd></div>` : ''}
        ${result.sellPrice && hero.mode === 'food' ? `<div><dt>Your price</dt><dd>${money(result.sellPrice)}</dd></div>` : ''}
        ${result.tax > 0 ? `<div><dt>Sales tax ${trimNum(result.taxPct)}%</dt><dd>${money(result.tax)}</dd></div>` : ''}
        ${result.guestTotal != null && result.tax > 0 ? `<div class="strong"><dt>Guest pays</dt><dd>${money(result.guestTotal)}</dd></div>` : ''}
      </dl>
      ${usedChart ? '<ul class="assumptions"><li>Cup weights follow the King Arthur chart. Cinnamon uses the USDA tablespoon weight.</li></ul>' : ''}
      ${result.warnings.length ? `<ul class="warns">${result.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      <div class="price-actions">
        <button class="btn primary" data-action="print">Print cost card</button>
        <div class="row">
          <button class="btn" data-action="copy">Copy summary</button>
          <button class="btn" data-action="export-csv">${isPro() ? '' : ICON.lock}CSV</button>
        </div>
      </div>
    </div>
  </div>`;
}

function businessLines() {
  if (!isPro()) return [];
  const b = state.settings.business || {};
  return [b.name, b.phone, b.email, b.website].map((s) => String(s || '').trim()).filter(Boolean);
}

function cardRows(recipe, result) {
  const rows = [];
  result.lines.forEach((line, i) => {
    if (line.blank) return;
    const src = viewRecipe(recipe).lines[i];
    const qty = [src.qty, C.UNITS[C.parseUnit(src.unit)]?.label || src.unit].filter(Boolean).join(' ');
    rows.push({ label: line.name, detail: [qty, line.note].filter(Boolean).join(' · '), amount: line.cost });
  });
  if (result.labor > 0) rows.push({ label: 'Labour', detail: `${C.formatMinutes(result.minutes)} × ${money(result.rate)}/h`, amount: result.labor });
  if (result.packaging > 0) rows.push({ label: 'Packaging', detail: `${money(C.parseNumber(recipe.packaging) || 0)} × ${result.servings} servings`, amount: result.packaging });
  if (result.overhead > 0) rows.push({ label: 'Overhead', detail: `${trimNum(recipe.overheadPct)}%`, amount: result.overhead });
  return rows;
}

function buildCard(recipe) {
  const result = C.costRecipe(viewRecipe(recipe));
  const rows = cardRows(recipe, result);
  const hero = heroOf(result);
  const biz = businessLines();
  const when = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const ref = `B-${recipe.id.slice(-4).toUpperCase()}`;
  return `<article class="costcard">
    <header class="q-head">
      <div>
        <h1>${esc(biz[0] || 'Cost card')}</h1>
        ${biz.slice(1).map((l) => `<p>${esc(l)}</p>`).join('')}
      </div>
      <div class="q-meta">
        <p><strong>${esc(ref)}</strong></p>
        <p>${esc(when)}</p>
        ${recipe.menu ? `<p>${esc(recipe.menu)}</p>` : ''}
      </div>
    </header>
    <h2>${esc(recipe.name || 'Recipe')}</h2>
    <p>${esc(hero.label)}: ${esc(hero.big)}. ${esc(hero.sub)}</p>
    <table class="q-table">
      <thead><tr><th>Item</th><th>Detail</th><th class="n">Amount</th></tr></thead>
      <tbody>
        ${rows.map((row) => `<tr><td>${esc(row.label)}</td><td>${esc(row.detail)}</td><td class="n">${money(row.amount)}</td></tr>`).join('')}
      </tbody>
    </table>
    <table class="q-totals">
      <tbody>
        <tr><td>Plate cost</td><td class="n">${money(result.batch)}</td></tr>
        ${result.perServing != null ? `<tr><td>Each serving</td><td class="n">${money(result.perServing)}</td></tr>` : ''}
        ${result.suggested != null ? `<tr><td>${esc(trimNum(result.targetPct))}% food cost</td><td class="n">${money(result.suggested)}</td></tr>` : ''}
        ${result.sellPrice ? `<tr><td>Your menu price</td><td class="n">${money(result.sellPrice)}</td></tr>` : ''}
        ${result.profitPerServing != null ? `<tr><td>Profit per serving</td><td class="n">${money(result.profitPerServing)}</td></tr>` : ''}
        ${result.tax > 0 ? `<tr><td>Sales tax</td><td class="n">${money(result.tax)}</td></tr><tr class="grand"><td>Guest pays</td><td class="n">${money(result.guestTotal)}</td></tr>` : ''}
      </tbody>
    </table>
    ${recipe.notes ? `<h2>Notes</h2><p>${esc(recipe.notes)}</p>` : ''}
    <p class="q-foot">Food-cost percent is ingredients divided by the menu price. Cup weights follow the King Arthur Baking chart unless a grams-per-cup figure is shown. Ground cinnamon uses 7.8 g per tablespoon. This is a cost estimate, not a nutrition label.${isPro() ? '' : ' Priced with Batchbook.'}</p>
  </article>`;
}

function summaryText(recipe) {
  const result = C.costRecipe(viewRecipe(recipe));
  const hero = heroOf(result);
  const lines = cardRows(recipe, result).map((row) => `${row.label}: ${money(row.amount)}${row.detail ? ` (${row.detail})` : ''}`);
  lines.push(`Plate cost: ${money(result.batch)}`);
  if (result.perServing != null) lines.push(`Each serving: ${money(result.perServing)}`);
  if (result.suggested != null) lines.push(`${trimNum(result.targetPct)}% food cost: ${money(result.suggested)}`);
  return [`${recipe.name || 'Recipe'}`, recipe.menu || '', `${hero.label}: ${hero.big}`, hero.sub, '', ...lines].filter((x) => x !== undefined).join('\n');
}

function csvFor(recipe) {
  const result = C.costRecipe(viewRecipe(recipe));
  const rows = [['Item', 'Detail', 'Amount'], ...cardRows(recipe, result).map((row) => [row.label, row.detail, row.amount.toFixed(2)])];
  rows.push(['Plate cost', '', result.batch.toFixed(2)]);
  if (result.perServing != null) rows.push(['Each serving', '', result.perServing.toFixed(2)]);
  if (result.suggested != null) rows.push([`${trimNum(result.targetPct)}% food cost`, 'per serving', result.suggested.toFixed(2)]);
  if (result.sellPrice) rows.push(['Your menu price', 'per serving', result.sellPrice.toFixed(2)]);
  if (result.profitPerServing != null) rows.push(['Profit per serving', '', result.profitPerServing.toFixed(2)]);
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

let toastTimer, undoFn = null;
function toast(msg, undo) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="btn link" data-action="undo">Undo</button>' : ''}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 7000 : 3200);
}

function allowRecipe() {
  if (isPro() || state.recipes.length < CONFIG.freeRecipeLimit) return true;
  openPro(`The free version keeps ${CONFIG.freeRecipeLimit} recipes. Get Pro for unlimited.`);
  return false;
}

function openPro(reason) {
  const s = proState();
  $('#proReason').textContent = reason || '';
  $('#proReason').hidden = !reason;
  $('#proPrice').textContent = s.price;
  $('#buyPro').hidden = !s.available || s.owned;
  $('#restorePro').hidden = !s.available || s.owned;
  $('#proStoreNote').hidden = s.available;
  $('#proStoreLink').href = storeLink();
  $('#proOwned').hidden = !s.owned;
  $('#proDialog').showModal();
}

function addRecipe(recipe, focusName = false) {
  state.recipes.push(recipe);
  state.activeId = recipe.id;
  persist(true);
  render();
  if (focusName) $('#f-r-name')?.select();
}

function pantryRowHtml(item, units) {
  const id = item?.id || uid();
  return `<div class="pantry-row" data-id="${esc(id)}">
    <input data-k="name" value="${esc(item?.name || '')}" placeholder="Name" aria-label="Ingredient" autocomplete="off">
    <input data-k="price" value="${esc(item?.price || '')}" inputmode="decimal" aria-label="Pack price" placeholder="Price" autocomplete="off">
    <input data-k="packQty" value="${esc(item?.packQty || '')}" inputmode="decimal" aria-label="Pack size" placeholder="Size" autocomplete="off">
    <select data-k="packUnit" aria-label="Pack unit">${unitOptions(item?.packUnit || (units === 'metric' ? 'kg' : 'lb'), units)}</select>
    <button type="button" class="icon-btn" data-action="remove-pantry-row" aria-label="Remove price">${ICON.x}</button>
  </div>`;
}

const actions = {
  sample() {
    if (!allowRecipe()) return;
    addRecipe(sampleRolls(state.settings));
  },
  lunch() {
    if (!allowRecipe()) return;
    addRecipe(sampleLunch(state.settings));
  },
  'new-recipe'() {
    if (!allowRecipe()) return;
    addRecipe(newRecipe(state.settings), true);
  },
  duplicate() {
    if (!allowRecipe()) return;
    const src = activeRecipe();
    if (!src) return;
    const recipe = JSON.parse(JSON.stringify(src));
    recipe.id = uid();
    recipe.name = `${src.name || 'Recipe'} (copy)`;
    recipe.createdAt = recipe.updatedAt = new Date().toISOString();
    recipe.lines = (recipe.lines || []).map((line) => ({ ...line, id: uid() }));
    addRecipe(recipe, true);
    toast('Recipe duplicated');
  },
  delete() {
    const recipe = activeRecipe();
    if (!recipe) return;
    const idx = state.recipes.indexOf(recipe);
    state.recipes.splice(idx, 1);
    state.activeId = [...state.recipes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id || null;
    persist(true);
    render();
    undoFn = () => { state.recipes.splice(idx, 0, recipe); state.activeId = recipe.id; persist(true); render(); };
    toast(`Deleted ${recipe.name || 'recipe'}`, true);
  },
  preset(el) {
    const recipe = activeRecipe();
    const preset = C.PRESETS[el.dataset.preset];
    if (!recipe || !preset) return;
    recipe.preset = el.dataset.preset;
    recipe.cardId = '';
    recipe.laborRate = preset.rate;
    recipe.targetFoodCostPct = preset.target;
    if (preset.packaging != null) recipe.packaging = preset.packaging;
    touch(recipe);
    render();
  },
  'add-line'() {
    const recipe = activeRecipe();
    recipe.lines.push(newLine(recipe.units));
    touch(recipe);
    render();
    main.querySelector('.ing:last-child .ing-name')?.focus();
  },
  'remove-line'(el) {
    const recipe = activeRecipe();
    const idx = recipe.lines.findIndex((line) => line.id === el.dataset.id);
    if (idx < 0) return;
    const [line] = recipe.lines.splice(idx, 1);
    touch(recipe);
    render();
    undoFn = () => { recipe.lines.splice(idx, 0, line); touch(recipe); render(); };
    toast('Ingredient removed', true);
  },
  'save-book'() {
    const recipe = activeRecipe();
    if (!recipe) return;
    let count = 0;
    for (const line of recipe.lines) {
      const view = pricedLine(line);
      if (!String(view.name || '').trim() || !String(view.price || '').trim()) continue;
      let pantry = state.settings.pantry.find((p) => p.name.toLowerCase() === view.name.toLowerCase());
      if (!pantry) {
        pantry = { id: uid(), name: view.name, price: '', packQty: '', packUnit: line.packUnit, usablePct: '', gramsPerCup: '' };
        state.settings.pantry.push(pantry);
      }
      pantry.name = view.name;
      pantry.price = view.price;
      pantry.packQty = view.packQty;
      pantry.packUnit = view.packUnit;
      pantry.usablePct = view.usablePct || '';
      pantry.gramsPerCup = view.gramsPerCup || '';
      line.pantryId = pantry.id;
      line.name = view.name;
      count += 1;
    }
    persist(true);
    render();
    toast(count ? `Saved ${count} ${count === 1 ? 'price' : 'prices'}` : 'Add a name and a pack price first');
  },
  'open-pantry'() {
    const units = activeRecipe()?.units || state.settings.units;
    const items = state.settings.pantry.length ? state.settings.pantry : [null];
    $('#pantryRows').innerHTML = items.map((item) => pantryRowHtml(item, units)).join('');
    $('#pantryDialog').showModal();
  },
  'add-pantry'() {
    const units = activeRecipe()?.units || state.settings.units;
    $('#pantryRows').insertAdjacentHTML('beforeend', pantryRowHtml(null, units));
    $('#pantryRows').lastElementChild?.querySelector('input')?.focus();
  },
  'remove-pantry-row'(el) {
    el.closest('.pantry-row')?.remove();
  },
  'save-card'() {
    if (!isPro()) return openPro('Saved shop presets are part of Pro.');
    const recipe = activeRecipe();
    if (!recipe) return;
    $('#cardName').value = recipe.preset && C.PRESETS[recipe.preset] ? C.PRESETS[recipe.preset].label : '';
    $('#cardDialog').showModal();
    $('#cardName').focus();
  },
  'delete-card'() {
    const recipe = activeRecipe();
    if (!recipe?.cardId) return;
    const idx = state.settings.cards.findIndex((c) => c.id === recipe.cardId);
    if (idx < 0) return;
    const [card] = state.settings.cards.splice(idx, 1);
    recipe.cardId = '';
    recipe.preset = 'custom';
    persist(true);
    render();
    undoFn = () => { state.settings.cards.splice(idx, 0, card); recipe.cardId = card.id; recipe.preset = 'card'; persist(true); render(); };
    toast(`Deleted ${card?.name || 'preset'}`, true);
  },
  print() {
    const recipe = activeRecipe();
    if (!recipe) return;
    $('#printArea').innerHTML = buildCard(recipe);
    window.print();
  },
  async copy() {
    const recipe = activeRecipe();
    if (!recipe) return;
    try { await navigator.clipboard.writeText(summaryText(recipe)); toast('Summary copied'); }
    catch { toast('Copying is blocked here. Use Print cost card instead.'); }
  },
  'export-csv'() {
    if (!isPro()) return openPro('CSV export is part of Pro.');
    const recipe = activeRecipe();
    const blob = new Blob(['\uFEFF' + csvFor(recipe)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(recipe.name || 'batchbook').replace(/[^\w\- ]+/g, '').trim() || 'batchbook'}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('CSV exported');
  },
  'open-settings'() {
    const s = state.settings;
    $('#set-units').value = s.units === 'metric' ? 'metric' : 'us';
    $('#set-currency').value = s.currency;
    for (const k of ['name', 'phone', 'email', 'website']) $(`#setBiz-${k}`).value = s.business[k] || '';
    $('#bizNote').hidden = isPro();
    $('#settingsDialog').showModal();
  },
  'open-pro'() { openPro(); },
  async 'buy-pro'(el) {
    el.disabled = true;
    try { if (await buyPro()) { $('#proDialog').close(); toast('Batchbook Pro is unlocked. Thank you.'); } }
    catch (e) { if (!e || e.name !== 'AbortError') toast('The purchase did not go through. You have not been charged.'); }
    finally { el.disabled = false; }
  },
  async 'restore-pro'() {
    try {
      const owned = await restorePro();
      toast(owned ? 'Pro restored' : 'No Pro purchase found for this Microsoft account.');
      if (owned) $('#proDialog').close();
    } catch { toast('Could not reach the Microsoft Store. Try again when you are online.'); }
  },
  'close-dialog'(el) { el.closest('dialog').close(); },
  undo() { if (undoFn) { undoFn(); undoFn = null; } $('#toast').classList.remove('show'); },
};

const PRICE_FIELDS = new Set(['price', 'packQty', 'packUnit', 'usablePct', 'gramsPerCup']);
function setPath(path, value) {
  const recipe = activeRecipe();
  if (!recipe) return;
  const [kind, a, b] = path.split('.');
  if (kind === 'r') {
    recipe[a] = value;
    if (a === 'laborRate' || a === 'targetFoodCostPct' || a === 'packaging') {
      recipe.preset = 'custom';
      recipe.cardId = '';
    }
  } else if (kind === 'l') {
    const line = recipe.lines.find((row) => row.id === a);
    if (!line) return;
    if (PRICE_FIELDS.has(b)) detach(line);
    line[b] = value;
  }
  touch(recipe);
}

function validKind(kind, raw) {
  if (String(raw ?? '').trim() === '') return true;
  const n = C.parseNumber(raw);
  if (!Number.isFinite(n) || n < 0) return false;
  if (kind === 'usable' || kind === 'target') return n > 0 && n <= 100;
  if (kind === 'servings') return n > 0;
  return true;
}
function validate(root) {
  for (const input of root.querySelectorAll('[data-kind]')) input.classList.toggle('invalid', !validKind(input.dataset.kind, input.value));
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el); }
});

main.addEventListener('input', (e) => {
  const t = e.target;
  if (!t.dataset.path) return;
  setPath(t.dataset.path, t.value);
  if (t.dataset.path === 'r.name') renderBar();
  if (t.dataset.kind) t.classList.toggle('invalid', !validKind(t.dataset.kind, t.value));
  updateQuote();
});

main.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'cardPick') {
    const recipe = activeRecipe();
    const card = state.settings.cards.find((c) => c.id === t.value);
    if (recipe && card) {
      recipe.cardId = card.id;
      recipe.preset = 'card';
      recipe.laborRate = card.rate;
      recipe.targetFoodCostPct = card.target;
      recipe.packaging = card.packaging;
      touch(recipe);
      render();
    }
    return;
  }
  if (t.id === 'pantryPick') {
    const recipe = activeRecipe();
    const pantry = state.settings.pantry.find((p) => p.id === t.value);
    if (recipe && pantry) {
      const line = newLine(recipe.units);
      line.pantryId = pantry.id;
      line.name = pantry.name;
      line.unit = recipe.units === 'metric' ? 'g' : 'cup';
      recipe.lines.push(line);
      touch(recipe);
      render();
      main.querySelector('.ing:last-child input[data-kind="qty"]')?.focus();
    }
    return;
  }
  if (!t.dataset.path) return;
  setPath(t.dataset.path, t.value);
  updateQuote();
});

$('#recipeSelect').addEventListener('change', (e) => {
  state.activeId = e.target.value;
  persist(true);
  render();
  window.scrollTo(0, 0);
});

$('#settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.settings.units = $('#set-units').value;
  state.settings.currency = $('#set-currency').value;
  for (const k of ['name', 'phone', 'email', 'website']) state.settings.business[k] = $(`#setBiz-${k}`).value.trim();
  persist(true);
  $('#settingsDialog').close();
  render();
  toast('Settings saved');
});

$('#cardForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const recipe = activeRecipe();
  if (!recipe) return;
  const card = {
    id: uid(),
    name: $('#cardName').value.trim() || 'Shop preset',
    rate: recipe.laborRate,
    target: recipe.targetFoodCostPct,
    packaging: recipe.packaging,
  };
  state.settings.cards.push(card);
  recipe.cardId = card.id;
  recipe.preset = 'card';
  persist(true);
  $('#cardDialog').close();
  render();
  toast(`Saved ${card.name}`);
});

$('#pantryForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const next = [...document.querySelectorAll('#pantryRows .pantry-row')].map((row) => {
    const id = row.dataset.id || uid();
    const prev = state.settings.pantry.find((p) => p.id === id);
    const item = {
      id,
      name: row.querySelector('[data-k="name"]').value.trim(),
      price: row.querySelector('[data-k="price"]').value.trim(),
      packQty: row.querySelector('[data-k="packQty"]').value.trim(),
      packUnit: row.querySelector('[data-k="packUnit"]').value,
      usablePct: prev?.usablePct || '',
      gramsPerCup: prev?.gramsPerCup || '',
    };
    return item;
  }).filter((item) => item.name);
  const ids = new Set(next.map((item) => item.id));
  for (const recipe of state.recipes) {
    for (const line of recipe.lines) {
      if (!line.pantryId || ids.has(line.pantryId)) continue;
      const old = state.settings.pantry.find((p) => p.id === line.pantryId);
      if (old) {
        line.price = old.price;
        line.packQty = old.packQty;
        line.packUnit = old.packUnit;
        line.usablePct = old.usablePct || '';
        if (!line.gramsPerCup) line.gramsPerCup = old.gramsPerCup || '';
      }
      line.pantryId = '';
    }
  }
  state.settings.pantry = next;
  persist(true);
  $('#pantryDialog').close();
  render();
  toast('Price book saved');
});

window.addEventListener('beforeprint', () => {
  const recipe = activeRecipe();
  if (recipe) $('#printArea').innerHTML = buildCard(recipe);
});

onProChange(() => render());
if (!state.activeId && state.recipes.length) state.activeId = state.recipes[0].id;
render();
initPro().then(() => {
  const q = new URLSearchParams(location.search);
  if (q.get('action') === 'new') actions['new-recipe']();
  else if (q.get('sample') === '1' && !state.recipes.length) actions.sample();
  else if (q.get('sample') === 'lunch' && !state.recipes.length) actions.lunch();
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});

window.__batchbook = { state, costRecipe: C.costRecipe };
