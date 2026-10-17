// Recipe costing. Money is rounded per line so a printed card adds up.
// Cup weights are the King Arthur Baking ingredient weight chart, except ground
// cinnamon (USDA FoodData Central, 7.8 g per tablespoon). A typed grams-per-cup
// always wins. None of this is a nutrition label.

export const G_PER_LB = 453.59237;
export const G_PER_OZ = G_PER_LB / 16;
export const CUP_ML = 236.5882365;

export const PRESETS = {
  cafe: { label: 'Cafe', rate: '16', target: '32', packaging: null },
  bakery: { label: 'Bakery', rate: '18', target: '28', packaging: null },
  catering: { label: 'Catering', rate: '22', target: '30', packaging: '1.25' },
};

const TBSP = CUP_ML / 16;
const TSP = CUP_ML / 48;

export const UNITS = {
  g: { family: 'weight', toBase: 1, label: 'g' },
  kg: { family: 'weight', toBase: 1000, label: 'kg' },
  oz: { family: 'weight', toBase: G_PER_OZ, label: 'oz' },
  lb: { family: 'weight', toBase: G_PER_LB, label: 'lb' },
  ml: { family: 'volume', toBase: 1, label: 'ml' },
  l: { family: 'volume', toBase: 1000, label: 'L' },
  tsp: { family: 'volume', toBase: TSP, label: 'tsp' },
  tbsp: { family: 'volume', toBase: TBSP, label: 'tbsp' },
  'fl oz': { family: 'volume', toBase: CUP_ML / 8, label: 'fl oz' },
  cup: { family: 'volume', toBase: CUP_ML, label: 'cup' },
  pint: { family: 'volume', toBase: CUP_ML * 2, label: 'pint' },
  quart: { family: 'volume', toBase: CUP_ML * 4, label: 'quart' },
  gallon: { family: 'volume', toBase: CUP_ML * 16, label: 'gallon' },
  each: { family: 'count', toBase: 1, label: 'each' },
  dozen: { family: 'count', toBase: 12, label: 'dozen' },
};

const UNIT_ORDER = ['cup', 'tbsp', 'tsp', 'oz', 'lb', 'fl oz', 'each', 'dozen', 'pint', 'quart', 'gallon', 'g', 'kg', 'ml', 'l'];
const METRIC_ORDER = ['g', 'kg', 'ml', 'l', 'each', 'dozen', 'cup', 'tbsp', 'tsp', 'oz', 'lb', 'fl oz'];

const ALIASES = {
  cups: 'cup', tablespoon: 'tbsp', tablespoons: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp',
  pound: 'lb', pounds: 'lb', lbs: 'lb', ounce: 'oz', ounces: 'oz',
  litre: 'l', liter: 'l', litres: 'l', liters: 'l', gram: 'g', grams: 'g',
  kilogram: 'kg', kilograms: 'kg', kilo: 'kg',
  floz: 'fl oz', gal: 'gallon', gallons: 'gallon', qt: 'quart', quarts: 'quart',
  pt: 'pint', pints: 'pint', milliliter: 'ml', millilitre: 'ml', milliliters: 'ml',
  piece: 'each', pieces: 'each', pc: 'each', eggs: 'each', egg: 'each',
};

// Specific names come first so "brown sugar" is not priced as white sugar.
const DENSITIES = [
  { re: /diamond crystal/, g: 8 * 16, label: 'Diamond Crystal kosher salt' },
  { re: /morton/, g: 16 * 16, label: 'Morton kosher salt' },
  { re: /kosher salt/, g: null, label: 'kosher salt' },
  { re: /\btable salt\b|\bsalt\b/, g: 18 * 16, label: 'table salt' },
  { re: /brown sugar/, g: 213, label: 'brown sugar' },
  { re: /powdered sugar|confectioners|icing sugar/, g: 113, label: "confectioners' sugar" },
  { re: /cinnamon[-\s]?sugar/, g: 200, label: 'cinnamon sugar' },
  { re: /cinnamon/, g: 7.8 * 16, label: 'ground cinnamon' },
  { re: /granulated sugar|white sugar|caster sugar|castor sugar|\bsugar\b/, g: 198, label: 'granulated sugar' },
  { re: /almond flour/, g: 96, label: 'almond flour' },
  { re: /whole wheat/, g: 113, label: 'whole wheat flour' },
  { re: /self-rising flour|self rising flour/, g: 113, label: 'self-rising flour' },
  { re: /pastry flour/, g: 106, label: 'pastry flour' },
  { re: /bread flour|cake flour|all[- ]purpose|\bap flour\b|plain flour|\bflour\b/, g: 120, label: 'flour' },
  { re: /cream cheese/, g: 227, label: 'cream cheese' },
  { re: /sour cream/, g: 227, label: 'sour cream' },
  { re: /buttermilk/, g: 227, label: 'buttermilk' },
  { re: /heavy cream|whipping cream|half[- ]and[- ]half|\bcream\b/, g: 227, label: 'cream' },
  { re: /coconut oil/, g: 226, label: 'coconut oil' },
  { re: /olive oil/, g: 200, label: 'olive oil' },
  { re: /vegetable oil|canola|\boil\b/, g: 198, label: 'vegetable oil' },
  { re: /cocoa/, g: 84, label: 'cocoa' },
  { re: /chocolate chips|chocolate chunks/, g: 170, label: 'chocolate chips' },
  { re: /peanut butter/, g: 270, label: 'peanut butter' },
  { re: /rolled oats|old-fashioned oats|quick[- ]cooking oats|\boats\b/, g: 89, label: 'oats' },
  { re: /corn\s*starch/, g: 112, label: 'cornstarch' },
  { re: /\bhoney\b/, g: 336, label: 'honey' },
  { re: /maple syrup/, g: 312, label: 'maple syrup' },
  { re: /\bbutter\b/, g: 226, label: 'butter' },
  { re: /\bmilk\b/, g: 227, label: 'milk' },
  { re: /\bwater\b/, g: 227, label: 'water' },
  { re: /baking powder/, g: 192, label: 'baking powder' },
  { re: /baking soda/, g: 288, label: 'baking soda' },
  { re: /instant yeast|\byeast\b/, g: 448 / 3, label: 'instant yeast' },
  { re: /vanilla/, g: 224, label: 'vanilla extract' },
  { re: /mayonnaise|\bmayo\b/, g: 226, label: 'mayonnaise' },
  { re: /\byogurt\b/, g: 227, label: 'yogurt' },
  { re: /\brice\b/, g: 198, label: 'long-grain rice' },
  { re: /cheddar|mozzarella|shredded cheese/, g: 113, label: 'shredded cheese' },
];

const FRAC = { '¼': '1/4', '½': '1/2', '¾': '3/4', '⅓': '1/3', '⅔': '2/3', '⅛': '1/8' };

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function parseNumber(raw) {
  let s = String(raw ?? '').trim().replace(/,/g, '');
  if (!s) return NaN;
  s = s.replace(/(\d)\s*([¼½¾⅓⅔⅛])/g, (_, n, ch) => `${n} ${FRAC[ch]}`);
  s = s.replace(/[¼½¾⅓⅔⅛]/g, (ch) => FRAC[ch]);
  const mixed = s.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denom = Number(mixed[3]);
    if (!denom) return NaN;
    const sign = mixed[1].startsWith('-') ? -1 : 1;
    return sign * (Math.abs(Number(mixed[1])) + Number(mixed[2]) / denom);
  }
  const frac = s.match(/^(-?)(\d+)\/(\d+)$/);
  if (frac) {
    const denom = Number(frac[3]);
    if (!denom) return NaN;
    return (frac[1] === '-' ? -1 : 1) * Number(frac[2]) / denom;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseUnit(raw) {
  const s = String(raw ?? '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  if (UNITS[s]) return s;
  return ALIASES[s] || null;
}

export function unitList(units) {
  return units === 'metric' ? METRIC_ORDER : UNIT_ORDER;
}

export function lookupDensity(name) {
  const s = String(name || '').toLowerCase();
  for (const d of DENSITIES) {
    if (!d.re.test(s)) continue;
    if (d.g == null) return { label: d.label, unresolved: true };
    return { gPerCup: d.g, label: d.label };
  }
  return null;
}

export function densityFor(name, override) {
  const n = parseNumber(override);
  if (Number.isFinite(n) && n > 0) return { gPerCup: n, label: 'your cup weight', custom: true };
  return lookupDensity(name);
}

function usedGrams(qty, unit, gPerCup) {
  const u = UNITS[unit];
  if (!u) return null;
  if (u.family === 'weight') return qty * u.toBase;
  if (u.family === 'volume' && gPerCup) return qty * u.toBase * (gPerCup / CUP_ML);
  return null;
}

function amountInPackUnits(qty, fromUnit, packUnit, gPerCup) {
  const a = UNITS[fromUnit];
  const b = UNITS[packUnit];
  if (!a || !b) return NaN;
  if (a.family === b.family) return (qty * a.toBase) / b.toBase;
  if (a.family === 'count' || b.family === 'count') return NaN;
  if (!gPerCup) return NaN;
  const grams = usedGrams(qty, fromUnit, gPerCup);
  if (!Number.isFinite(grams)) return NaN;
  if (b.family === 'weight') return grams / b.toBase;
  const ml = grams / (gPerCup / CUP_ML);
  return ml / b.toBase;
}

export function formatGrams(g) {
  if (!Number.isFinite(g)) return '';
  const r = Math.round(g * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)} g`;
}

export function formatPct(n) {
  if (!Number.isFinite(n)) return '';
  const r = Math.round(n * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)}%`;
}

export function formatMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  if (minutes >= 90) {
    const h = Math.round((minutes / 60) * 10) / 10;
    return `${h} h`;
  }
  return `${Math.round(minutes * 10) / 10} min`;
}

export function priceLine(line) {
  const name = String(line?.name || '').trim();
  const qtyRaw = String(line?.qty ?? '').trim();
  const priceRaw = String(line?.price ?? '').trim();
  const packRaw = String(line?.packQty ?? '').trim();
  const usableRaw = String(line?.usablePct ?? '').trim();
  if (!name && !qtyRaw && !priceRaw && !packRaw && !usableRaw) {
    return { blank: true, cost: 0, warning: '', note: '', grams: null };
  }

  const qty = parseNumber(qtyRaw);
  const price = parseNumber(priceRaw);
  const packQty = parseNumber(packRaw);
  const unit = parseUnit(line?.unit);
  const packUnit = parseUnit(line?.packUnit);
  const base = { blank: false, cost: 0, warning: '', note: '', grams: null, densityLabel: '', name: name || 'Ingredient' };

  if (!Number.isFinite(qty) || qty < 0) return { ...base, warning: 'Enter how much the recipe uses.' };
  if (!unit || !packUnit) return { ...base, warning: 'That unit is not one Batchbook knows.' };
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(packQty) || packQty <= 0) {
    return { ...base, warning: 'Enter what you paid and the pack size.' };
  }

  let usable = 100;
  if (usableRaw) {
    usable = parseNumber(usableRaw);
    if (!Number.isFinite(usable) || usable <= 0 || usable > 100) {
      return { ...base, warning: 'Usable percent has to be between 0 and 100.' };
    }
  }

  const familiesDiffer = UNITS[unit].family !== UNITS[packUnit].family;
  let density = null;
  if (familiesDiffer) {
    if (UNITS[unit].family === 'count' || UNITS[packUnit].family === 'count') {
      return { ...base, warning: 'Each and dozen only convert to each other.' };
    }
    density = densityFor(name, line?.gramsPerCup);
    if (!density) return { ...base, warning: 'Add grams per cup, or price this in the same kind of unit.' };
    if (density.unresolved) {
      return { ...base, warning: 'Kosher salt brands weigh differently. Add grams per cup: Diamond Crystal 128, Morton 256.' };
    }
  }

  const gPerCup = density?.gPerCup;
  const used = amountInPackUnits(qty, unit, packUnit, gPerCup);
  if (!Number.isFinite(used)) return { ...base, warning: 'Those units cannot be converted.' };
  const cost = round2(price * (used / packQty) / (usable / 100));
  const grams = usedGrams(qty, unit, gPerCup);
  let note = '';
  if (density && Number.isFinite(grams)) {
    const cup = `${Math.round(density.gPerCup * 10) / 10} g/cup`;
    note = `${formatGrams(grams)} · ${density.custom ? 'your cup weight' : cup}`;
  }
  if (usable !== 100) note = note ? `${note} · ${usable}% usable` : `${usable}% usable`;
  return { ...base, cost, note, grams, densityLabel: density?.label || '' };
}

export function costRecipe(recipe) {
  const lines = (recipe?.lines || []).map(priceLine);
  const ingredients = round2(lines.reduce((sum, line) => sum + (line.cost || 0), 0));
  const servingsN = parseNumber(recipe?.servings);
  const servings = Number.isFinite(servingsN) && servingsN > 0 ? servingsN : 0;
  const minutes = parseNumber(recipe?.laborMinutes);
  const rate = parseNumber(recipe?.laborRate);
  const labor = round2((Number.isFinite(minutes) && minutes > 0 ? minutes : 0) / 60 * (Number.isFinite(rate) && rate > 0 ? rate : 0));
  const packEach = parseNumber(recipe?.packaging);
  const packaging = round2((Number.isFinite(packEach) && packEach > 0 ? packEach : 0) * servings);
  const overheadPct = parseNumber(recipe?.overheadPct);
  const overheadRate = Number.isFinite(overheadPct) && overheadPct > 0 ? overheadPct : 0;
  const overhead = round2((ingredients + labor + packaging) * overheadRate / 100);
  const batch = round2(ingredients + labor + packaging + overhead);
  const targetPct = parseNumber(recipe?.targetFoodCostPct);
  const target = Number.isFinite(targetPct) && targetPct > 0 ? targetPct : 0;
  const ingredientEach = servings ? ingredients / servings : 0;
  const plateEach = servings ? batch / servings : 0;
  const suggested = target && servings && ingredients > 0 ? round2(ingredientEach / (target / 100)) : null;
  const sell = parseNumber(recipe?.sellPrice);
  const sellPrice = Number.isFinite(sell) && sell > 0 ? sell : 0;
  const foodCostPct = sellPrice && ingredientEach ? (ingredientEach / sellPrice) * 100 : null;
  const profitPerServing = sellPrice && servings ? round2(sellPrice - plateEach) : null;
  const taxPct = parseNumber(recipe?.taxPct);
  const taxRate = Number.isFinite(taxPct) && taxPct > 0 ? taxPct : 0;
  const tax = sellPrice && servings ? round2(sellPrice * servings * taxRate / 100) : 0;
  const guestTotal = sellPrice && servings ? round2(sellPrice * servings + tax) : null;

  const warnings = [];
  for (const line of lines) {
    if (line.warning) warnings.push(`${line.name}: ${line.warning}`);
  }
  const priced = lines.some((line) => !line.blank);
  if (priced && !servings) warnings.push('Enter how many this recipe makes.');
  if (suggested != null && servings && suggested < plateEach - 0.001) {
    warnings.push('The food-cost price is under the cost of the plate. Food-cost percent leaves out labour, packaging and overhead.');
  }

  return {
    lines,
    ingredients,
    labor,
    packaging,
    overhead,
    batch,
    servings,
    perServing: servings ? round2(plateEach) : null,
    ingredientPerServing: servings ? round2(ingredientEach) : null,
    suggested,
    sellPrice,
    foodCostPct,
    profitPerServing,
    targetPct: target,
    tax,
    taxPct: taxRate,
    guestTotal,
    minutes: Number.isFinite(minutes) ? minutes : 0,
    rate: Number.isFinite(rate) ? rate : 0,
    warnings,
  };
}
