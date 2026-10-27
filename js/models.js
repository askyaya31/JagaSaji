import { Mlp, makeRng } from './mlp.js';
import { nutritionLevel } from './rules.js';

export const LEVELS = ['ok', 'watch', 'stop'];

/* ---------- Deep learning: klasifikasi status gizi ---------- */
export const nutritionInput = (t) => [t.kkal / 1000, t.protein / 50, t.lemak / 50, t.serat / 12];

export function trainNutritionModel(seed = 42) {
  const rand = makeRng(seed);
  const make = (n) => Array.from({ length: n }, () => {
    const t = { kkal: 250 + rand() * 750, protein: 5 + rand() * 40, lemak: 3 + rand() * 42, serat: rand() * 12 };
    return { x: nutritionInput(t), y: LEVELS.indexOf(nutritionLevel(t)) };
  });
  const train = make(900), test = make(300);
  const net = new Mlp(4, 8, 3, rand);
  for (let epoch = 0; epoch < 150; epoch++) for (const d of train) net.train(d.x, d.y, 0.08);

  const confusion = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];            // baris = sebenarnya, kolom = prediksi
  for (const d of test) confusion[d.y][net.predict(d.x).label]++;
  const correct = confusion[0][0] + confusion[1][1] + confusion[2][2];
  return { net, confusion, accuracy: correct / test.length, nTrain: train.length, nTest: test.length };
}

/* ---------- Machine learning: regresi logistik risiko pangan ---------- */
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

export function riskFeatures({ suhuSimpan, jam, suhuSaji, higiene, berisiko }) {
  const inZone = suhuSimpan > 5 && suhuSimpan < 60 ? 1 : 0;
  return [
    (inZone * Math.min(jam, 10)) / 4,            // lama paparan zona bahaya (relatif batas 4 jam)
    berisiko ? 1 : 0,                             // bahan berisiko tinggi
    (5 - higiene) / 5,                            // item higiene yang tidak terpenuhi
    suhuSaji < 60 ? (60 - suhuSaji) / 50 : 0,     // seberapa dingin saat disajikan
  ];
}

export function trainRiskModel(seed = 7) {
  const rand = makeRng(seed);
  const make = (n) => Array.from({ length: n }, () => {
    const s = { suhuSimpan: rand() * 80, jam: rand() * 10, suhuSaji: 10 + rand() * 75,
                higiene: Math.floor(rand() * 6), berisiko: rand() < 0.4 };
    const x = riskFeatures(s);
    // "Kebenaran" sintetis: rumus buatan + noise. Ganti dengan data lapangan jika ada.
    const z = 1.6 * x[0] + 1.1 * x[1] + 1.8 * x[2] + 1.4 * x[3] - 2.6;
    return { x, y: rand() < sigmoid(z) ? 1 : 0 };
  });
  const train = make(1500), test = make(500);
  let w = [0, 0, 0, 0], b = 0;
  const score = (x) => sigmoid(w.reduce((s, wi, i) => s + wi * x[i], b));
  for (let epoch = 0; epoch < 300; epoch++) {
    for (const d of train) {
      const err = score(d.x) - d.y;
      w = w.map((wi, i) => wi - 0.03 * err * d.x[i]);
      b -= 0.03 * err;
    }
  }
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const d of test) {
    const pred = score(d.x) > 0.5 ? 1 : 0;
    if (pred && d.y) tp++; else if (pred && !d.y) fp++; else if (!pred && d.y) fn++; else tn++;
  }
  return {
    predict: score, weights: w, bias: b, nTrain: train.length, nTest: test.length,
    accuracy: (tp + tn) / test.length,
    precision: tp / Math.max(tp + fp, 1),
    recall: tp / Math.max(tp + fn, 1),
    counts: { tp, fp, fn, tn },
  };
}