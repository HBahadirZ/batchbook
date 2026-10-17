// Local persistence. Recipes stay on this PC; nothing is sent anywhere.
import { PRESETS } from './calc.js';

const KEY = 'batchbook.v1';
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function guessCurrency(locale) {
  const region = (locale.split('-')[1] || '').toUpperCase();
  const map = { US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', TR: 'TRY', IN: 'INR', MX: 'MXN' };
  return map[region] || 'USD';
}

function guessUnits(locale) {
  return /^en(-(US|CA))?$/i.test(locale) || /^en$/i.test(locale) ? 'us' : 'metric';
}

export function defaultSettings() {
  const locale = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
  return {
    units: guessUnits(locale),
    currency: guessCurrency(locale),
    business: { name: '', phone: '', email: '', website: '' },
    cards: [],
    pantry: [],
  };
}

export function newLine(units) {
  const metric = units === 'metric';
  return {
    id: uid(),
    pantryId: '',
    name: '',
    qty: '',
    unit: metric ? 'g' : 'cup',
    price: '',
    packQty: '',
    packUnit: metric ? 'kg' : 'lb',
    usablePct: '',
    gramsPerCup: '',
  };
}

export function newRecipe(settings, name = 'New recipe') {
  const units = settings?.units === 'metric' ? 'metric' : 'us';
  const now = new Date().toISOString();
  const preset = PRESETS.bakery;
  return {
    id: uid(),
    name,
    menu: '',
    preset: 'bakery',
    cardId: '',
    units,
    createdAt: now,
    updatedAt: now,
    servings: '',
    sellPrice: '',
    targetFoodCostPct: preset.target,
    laborMinutes: '',
    laborRate: preset.rate,
    packaging: '',
    overheadPct: '',
    taxPct: '',
    notes: '',
    lines: [newLine(units)],
  };
}

function line(units, spec) {
  const row = newLine(units);
  return { ...row, ...spec, id: row.id };
}

export function sampleRolls(settings) {
  const units = settings?.units === 'metric' ? 'metric' : 'us';
  const r = newRecipe(settings, 'Sample: Saturday cinnamon rolls');
  r.units = 'us';
  r.menu = 'Saturday market';
  r.preset = 'bakery';
  r.servings = '12';
  r.sellPrice = '4.50';
  r.targetFoodCostPct = PRESETS.bakery.target;
  r.laborMinutes = '45';
  r.laborRate = PRESETS.bakery.rate;
  r.packaging = '';
  r.notes = 'Icing is in the batch. The menu price is per roll. Cup weights follow the King Arthur chart when a package is sold by weight.';
  const u = units === 'metric' ? 'metric' : 'us';
  r.lines = [
    line(u, { name: 'All-purpose flour', qty: '4', unit: 'cup', price: '4.79', packQty: '5', packUnit: 'lb' }),
    line(u, { name: 'Granulated sugar', qty: '3/4', unit: 'cup', price: '3.49', packQty: '4', packUnit: 'lb' }),
    line(u, { name: 'Butter', qty: '1/2', unit: 'cup', price: '4.99', packQty: '1', packUnit: 'lb' }),
    line(u, { name: 'Milk', qty: '1', unit: 'cup', price: '3.89', packQty: '1', packUnit: 'gallon' }),
    line(u, { name: 'Eggs', qty: '2', unit: 'each', price: '4.49', packQty: '1', packUnit: 'dozen' }),
    line(u, { name: 'Instant yeast', qty: '2.25', unit: 'tsp', price: '6.99', packQty: '4', packUnit: 'oz' }),
    line(u, { name: 'Salt', qty: '1', unit: 'tsp', price: '1.25', packQty: '26', packUnit: 'oz' }),
    line(u, { name: 'Ground cinnamon', qty: '2', unit: 'tbsp', price: '3.99', packQty: '2.37', packUnit: 'oz' }),
    line(u, { name: 'Brown sugar', qty: '1/2', unit: 'cup', price: '2.79', packQty: '2', packUnit: 'lb' }),
    line(u, { name: 'Cream cheese', qty: '8', unit: 'oz', price: '2.99', packQty: '8', packUnit: 'oz' }),
    line(u, { name: 'Powdered sugar', qty: '2', unit: 'cup', price: '2.49', packQty: '2', packUnit: 'lb' }),
    line(u, { name: 'Vanilla extract', qty: '2', unit: 'tsp', price: '4.99', packQty: '2', packUnit: 'fl oz' }),
  ];
  return r;
}

export function sampleLunch(settings) {
  const units = settings?.units === 'metric' ? 'metric' : 'us';
  const r = newRecipe(settings, 'Sample: boxed lunches');
  r.units = 'us';
  r.menu = 'Office drop-off';
  r.preset = 'catering';
  r.servings = '24';
  r.sellPrice = '';
  r.targetFoodCostPct = PRESETS.catering.target;
  r.laborMinutes = '90';
  r.laborRate = PRESETS.catering.rate;
  r.packaging = PRESETS.catering.packaging;
  r.notes = 'Chicken is the weight you plate. Lettuce is priced at 70% usable. Packaging is the box, napkin and wrap.';
  r.lines = [
    line(units, { name: 'Chicken breast', qty: '6', unit: 'lb', price: '3.99', packQty: '1', packUnit: 'lb' }),
    line(units, { name: 'Rolls', qty: '24', unit: 'each', price: '3.49', packQty: '8', packUnit: 'each' }),
    line(units, { name: 'Cheddar', qty: '1.5', unit: 'lb', price: '6.99', packQty: '2', packUnit: 'lb' }),
    line(units, { name: 'Mayonnaise', qty: '12', unit: 'fl oz', price: '4.79', packQty: '30', packUnit: 'fl oz' }),
    line(units, { name: 'Lettuce', qty: '1', unit: 'lb', price: '2.49', packQty: '1', packUnit: 'lb', usablePct: '70' }),
  ];
  return r;
}

export function load() {
  try {
    if (typeof localStorage === 'undefined') throw new Error('no storage');
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.recipes)) {
        data.settings = { ...defaultSettings(), ...(data.settings || {}) };
        data.settings.business = { ...defaultSettings().business, ...(data.settings.business || {}) };
        data.settings.cards = Array.isArray(data.settings.cards) ? data.settings.cards : [];
        data.settings.pantry = Array.isArray(data.settings.pantry) ? data.settings.pantry : [];
        return data;
      }
    }
  } catch { /* storage unavailable or corrupt: start fresh */ }
  return { recipes: [], activeId: null, settings: defaultSettings() };
}

let saveTimer = null;
export function save(state, immediate = false) {
  const write = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  };
  clearTimeout(saveTimer);
  if (immediate) return write();
  saveTimer = setTimeout(write, 250);
  return true;
}
