/** Pembangkit angka acak yang bisa diulang (mulberry32). Seed sama = hasil sama. */
export function makeRng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Jaringan saraf satu lapis tersembunyi: tanh -> softmax, dilatih dengan SGD. */
export class Mlp {
  constructor(nIn, nHid, nOut, rand) {
    this.nIn = nIn; this.nHid = nHid; this.nOut = nOut;
    const w = () => (rand() - 0.5) * 1.2;
    this.W1 = Array.from({ length: nHid }, () => Array.from({ length: nIn }, w));
    this.b1 = new Array(nHid).fill(0);
    this.W2 = Array.from({ length: nOut }, () => Array.from({ length: nHid }, w));
    this.b2 = new Array(nOut).fill(0);
  }

  forward(x) {
    const h = this.W1.map((row, j) =>
      Math.tanh(row.reduce((s, w, i) => s + w * x[i], this.b1[j])));
    const z = this.W2.map((row, c) =>
      row.reduce((s, w, j) => s + w * h[j], this.b2[c]));
    const m = Math.max(...z);
    const e = z.map((v) => Math.exp(v - m));
    const sum = e.reduce((a, b) => a + b, 0);
    return { h, p: e.map((v) => v / sum) };
  }

  /** Satu langkah gradient descent untuk satu sampel (x, kelas y). */
  train(x, y, lr) {
    const { h, p } = this.forward(x);
    const g = p.map((v, c) => v - (c === y ? 1 : 0));            // gradien output
    const gh = h.map((hv, j) =>                                    // gradien lapisan tersembunyi
      (1 - hv * hv) * g.reduce((s, gc, c) => s + gc * this.W2[c][j], 0));
    for (let c = 0; c < this.nOut; c++) {
      for (let j = 0; j < this.nHid; j++) this.W2[c][j] -= lr * g[c] * h[j];
      this.b2[c] -= lr * g[c];
    }
    for (let j = 0; j < this.nHid; j++) {
      for (let i = 0; i < this.nIn; i++) this.W1[j][i] -= lr * gh[j] * x[i];
      this.b1[j] -= lr * gh[j];
    }
  }

  predict(x) {
    const { p } = this.forward(x);
    return { p, label: p.indexOf(Math.max(...p)) };
  }
}