/** Ubah teks "3.8, 4.1, 4.0" menjadi array angka. */
export function parseReadings(text) {
  return text.split(/[,\s;]+/).filter((s) => s !== '').map(Number).filter(Number.isFinite);
}

/** Tandai pembacaan yang melewati batas mutlak atau menyimpang > zLimit simpangan baku
 *  dari rata-rata `window` pembacaan sebelumnya. */
export function detect(values, { window = 6, zLimit = 3, hardLimit = 5 } = {}) {
  return values.map((v, i) => {
    let z = 0;
    if (i >= window) {
      const w = values.slice(i - window, i);
      const mean = w.reduce((s, x) => s + x, 0) / window;
      const sd = Math.sqrt(w.reduce((s, x) => s + (x - mean) ** 2, 0) / window);
      z = (v - mean) / Math.max(sd, 0.5);        // lantai 0.5 °C: mencegah alarm palsu saat data sangat stabil
    }
    const overLimit = v > hardLimit;
    return { v, z, overLimit, anomaly: overLimit || Math.abs(z) > zLimit };
  });
}

/** Data simulasi sensor 24 jam. */
export function simulate(faulty, rand = Math.random) {
  const a = Array.from({ length: 24 }, () => +(3.8 + (rand() - 0.5) * 1.2).toFixed(1));
  if (faulty) {
    a[5] = 6.8;
    for (let i = 15; i < 19; i++) a[i] = +(7.5 + (i - 15) * 0.4 + rand()).toFixed(1);
  }
  return a;
}

/** Hasilkan string SVG. Warna diatur lewat kelas CSS di style.css. */
export function renderChart(results, hardLimit = 5) {
  const W = 640, H = 200, padL = 36, padR = 12, padT = 12, padB = 24;
  const vals = results.map((r) => r.v);
  const lo = Math.min(0, ...vals), hi = Math.max(hardLimit + 1, ...vals) + 0.5;
  const X = (i) => padL + (i * (W - padL - padR)) / Math.max(results.length - 1, 1);
  const Y = (v) => H - padB - ((v - lo) / (hi - lo)) * (H - padT - padB);
  const pts = results.map((r, i) => `${X(i).toFixed(1)},${Y(r.v).toFixed(1)}`).join(' ');
  const dots = results.map((r, i) =>
    `<circle class="dot${r.anomaly ? ' bad' : ''}" cx="${X(i).toFixed(1)}" cy="${Y(r.v).toFixed(1)}" r="${r.anomaly ? 5 : 3}"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik suhu per jam dengan batas ${hardLimit} derajat Celsius">
    <line class="limit" x1="${padL}" x2="${W - padR}" y1="${Y(hardLimit)}" y2="${Y(hardLimit)}"/>
    <text x="${padL + 4}" y="${Y(hardLimit) - 5}">batas ${hardLimit} °C</text>
    <polyline class="line" points="${pts}"/>${dots}
    <text x="${padL}" y="${H - 6}">jam ke-0</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end">jam ke-${results.length - 1}</text>
  </svg>`;
}