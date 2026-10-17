import assert from 'node:assert/strict';
import test from 'node:test';
import * as C from '../js/calc.js';
import { sampleLunch, sampleRolls } from '../js/storage.js';

test('fractions, mixed numbers and kitchen glyphs', () => {
  assert.equal(C.parseNumber('3/4'), 0.75);
  assert.equal(C.parseNumber('1 1/2'), 1.5);
  assert.equal(C.parseNumber('1½'), 1.5);
  assert.equal(C.parseNumber('½'), 0.5);
  assert.equal(C.parseNumber(''), NaN);
  assert.equal(C.parseUnit('Cups'), 'cup');
  assert.equal(C.parseUnit('fl. oz.'), 'fl oz');
  assert.equal(C.parseUnit('pounds'), 'lb');
});

test('a cup of sugar from a gram pack is the chart weight', () => {
  const line = C.priceLine({ name: 'Sugar', qty: '1', unit: 'cup', price: '1', packQty: '198', packUnit: 'g' });
  assert.equal(line.grams, 198);
  assert.equal(line.densityLabel, 'granulated sugar');
  assert.equal(line.cost, 1);
});

test('brown sugar is not priced as white sugar', () => {
  const line = C.priceLine({ name: 'Brown sugar', qty: '1', unit: 'cup', price: '2.13', packQty: '213', packUnit: 'g' });
  assert.equal(line.grams, 213);
  assert.equal(line.densityLabel, 'brown sugar');
  assert.equal(line.cost, 2.13);
});

test('butter, yeast, salt and cinnamon use their chart weights', () => {
  assert.equal(C.priceLine({ name: 'Butter', qty: '1/2', unit: 'cup', price: '2', packQty: '113', packUnit: 'g' }).cost, 2);
  assert.equal(C.priceLine({ name: 'Instant yeast', qty: '2.25', unit: 'tsp', price: '1', packQty: '7', packUnit: 'g' }).cost, 1);
  assert.equal(C.priceLine({ name: 'Salt', qty: '1', unit: 'tsp', price: '1', packQty: '6', packUnit: 'g' }).cost, 1);
  assert.equal(C.priceLine({ name: 'Ground cinnamon', qty: '1', unit: 'tbsp', price: '1', packQty: '7.8', packUnit: 'g' }).cost, 1);
});

test('milk poured from a gallon needs no density, and two eggs come out of a dozen', () => {
  const milk = C.priceLine({ name: 'Milk', qty: '1', unit: 'cup', price: '3.84', packQty: '1', packUnit: 'gallon' });
  assert.equal(milk.cost, 0.24);
  assert.equal(milk.grams, null);
  const eggs = C.priceLine({ name: 'Eggs', qty: '2', unit: 'each', price: '4.20', packQty: '1', packUnit: 'dozen' });
  assert.equal(eggs.cost, 0.7);
});

test('usable yield raises the price of what you can actually plate', () => {
  const line = C.priceLine({ name: 'Lettuce', qty: '1', unit: 'lb', price: '2.10', packQty: '1', packUnit: 'lb', usablePct: '70' });
  assert.equal(line.cost, 3);
  assert.match(line.note, /70% usable/);
});

test('a typed cup weight overrides the chart', () => {
  const line = C.priceLine({ name: 'Flour', qty: '1', unit: 'cup', price: '1', packQty: '100', packUnit: 'g', gramsPerCup: '100' });
  assert.equal(line.grams, 100);
  assert.equal(line.cost, 1);
  assert.match(line.note, /your cup weight/);
});

test('missing conversions warn and cost nothing', () => {
  const mystery = C.priceLine({ name: 'House spice', qty: '1', unit: 'tsp', price: '4', packQty: '1', packUnit: 'oz' });
  assert.equal(mystery.cost, 0);
  assert.match(mystery.warning, /grams per cup/);
  const kosher = C.priceLine({ name: 'Kosher salt', qty: '1', unit: 'tsp', price: '2', packQty: '1', packUnit: 'lb' });
  assert.equal(kosher.cost, 0);
  assert.match(kosher.warning, /Diamond Crystal/);
  const eggs = C.priceLine({ name: 'Eggs', qty: '100', unit: 'g', price: '4', packQty: '1', packUnit: 'dozen' });
  assert.equal(eggs.cost, 0);
  assert.match(eggs.warning, /each other/);
});

test('metric weight divides a kilogram pack', () => {
  const line = C.priceLine({ name: 'Chicken', qty: '500', unit: 'g', price: '8', packQty: '1', packUnit: 'kg' });
  assert.equal(line.cost, 4);
  assert.equal(line.grams, 500);
});

test('food-cost price ignores labour, and says so when it cannot cover the plate', () => {
  const r = C.costRecipe({
    servings: '1',
    targetFoodCostPct: '50',
    laborMinutes: '60',
    laborRate: '30',
    lines: [{ name: 'Rice', qty: '1', unit: 'lb', price: '10', packQty: '1', packUnit: 'lb' }],
  });
  assert.equal(r.ingredients, 10);
  assert.equal(r.labor, 30);
  assert.equal(r.suggested, 20);
  assert.equal(r.batch, 40);
  assert.ok(r.warnings.some((w) => /under the cost of the plate/.test(w)));
});

test('a menu price reports food cost, profit and tax on the batch', () => {
  const r = C.costRecipe({
    servings: '4',
    sellPrice: '8',
    taxPct: '10',
    targetFoodCostPct: '25',
    lines: [{ name: 'Rice', qty: '2', unit: 'lb', price: '5', packQty: '1', packUnit: 'lb' }],
  });
  assert.equal(r.ingredients, 10);
  assert.equal(r.perServing, 2.5);
  assert.equal(r.suggested, 10);
  assert.equal(C.formatPct(r.foodCostPct), '31.3%');
  assert.equal(r.profitPerServing, 5.5);
  assert.equal(r.tax, 3.2);
  assert.equal(r.guestTotal, 35.2);
});

test('overhead is a percent of food, labour and packaging', () => {
  const r = C.costRecipe({
    servings: '2',
    overheadPct: '10',
    packaging: '1',
    laborMinutes: '30',
    laborRate: '20',
    lines: [{ name: 'Rice', qty: '1', unit: 'lb', price: '10', packQty: '1', packUnit: 'lb' }],
  });
  assert.equal(r.labor, 10);
  assert.equal(r.packaging, 2);
  assert.equal(r.overhead, 2.2);
  assert.equal(r.batch, 24.2);
});

test('an empty recipe costs nothing and does not warn', () => {
  const r = C.costRecipe({ lines: [{ name: '', qty: '', unit: 'cup', price: '', packQty: '', packUnit: 'lb' }] });
  assert.equal(r.batch, 0);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.lines[0].blank, true);
});

test('saturday cinnamon rolls are a card a baker could trust', () => {
  const r = C.costRecipe(sampleRolls({ units: 'us' }));
  assert.equal(r.lines.filter((l) => l.warning).length, 0);
  assert.equal(r.ingredients, 9.67);
  assert.equal(r.labor, 13.5);
  assert.equal(r.batch, 23.17);
  assert.equal(r.perServing, 1.93);
  assert.equal(r.suggested, 2.88);
  assert.equal(C.formatPct(r.foodCostPct), '17.9%');
  assert.equal(r.profitPerServing, 2.57);
  assert.equal(r.warnings.length, 0);
});

test('boxed lunches suggest a menu price from a 30% food cost', () => {
  const r = C.costRecipe(sampleLunch());
  assert.equal(r.lines.filter((l) => l.warning).length, 0);
  assert.equal(r.ingredients, 45.13);
  assert.equal(r.labor, 33);
  assert.equal(r.packaging, 30);
  assert.equal(r.batch, 108.13);
  assert.equal(r.perServing, 4.51);
  assert.equal(r.suggested, 6.27);
  assert.equal(r.sellPrice, 0);
});
