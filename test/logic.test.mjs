import test from 'node:test';
import assert from 'node:assert/strict';
import { foodByName } from '../js/data.js';
import { sumMenu, nutritionLevel, hazardChecks } from '../js/rules.js';
import { trainNutritionModel, trainRiskModel, riskFeatures } from '../js/models.js';
import { detect, parseReadings } from '../js/anomaly.js';

const menu = (pairs) => pairs.map(([n, g]) => ({ food: foodByName(n), gram: g }));

test('menu contoh berstatus ok', () => {
  const t = sumMenu(menu([['Nasi Putih', 200], ['Ayam Goreng', 80], ['Capcay Kuah', 80], ['Tempe Goreng', 40], ['Pisang Ambon', 80]]));
  assert.equal(nutritionLevel(t), 'ok');
});

test('menu tanpa lauk berstatus stop', () => {
  const t = sumMenu(menu([['Nasi Putih', 200]]));
  assert.equal(nutritionLevel(t), 'stop');
});

test('makanan di zona bahaya lebih dari 4 jam wajib dibuang', () => {
  const r = hazardChecks({ suhuSimpan: 30, jam: 5, suhuSaji: 62, higiene: 5 });
  assert.equal(r.hard, true);
});

test('model risiko: batch buruk lebih berisiko daripada batch baik', () => {
  const m = trainRiskModel();
  const good = m.predict(riskFeatures({ suhuSimpan: 65, jam: 2, suhuSaji: 62, higiene: 5, berisiko: false }));
  const bad = m.predict(riskFeatures({ suhuSimpan: 30, jam: 5, suhuSaji: 30, higiene: 3, berisiko: true }));
  assert.ok(bad > good + 0.5);
});

test('model gizi: akurasi uji di atas 90%', () => {
  assert.ok(trainNutritionModel().accuracy > 0.9);
});

test('deteksi anomali menandai lonjakan suhu', () => {
  const r = detect(parseReadings('3.8, 4, 3.9, 4.1, 3.7, 4, 3.9, 8.5, 4'));
  assert.equal(r[7].anomaly, true);
  assert.equal(r[8].anomaly, false);
});