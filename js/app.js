import { FOODS, foodByName } from './data.js';
import { sumMenu, nutritionLevel, recommendations, hazardChecks } from './rules.js';
import { trainNutritionModel, nutritionInput, trainRiskModel, riskFeatures, LEVELS } from './models.js';
import { parseReadings, detect, simulate, renderChart } from './anomaly.js';

const $ = (sel) => document.querySelector(sel);
const fmt = (n, d = 0) => Number(n).toFixed(d);
const NUTRI_LABEL = { ok: 'Memenuhi', watch: 'Perlu perbaikan', stop: 'Tidak memenuhi', none: 'Belum dinilai' };
const SAFE_LABEL = { ok: 'Aman', watch: 'Perlu pengawasan', stop: 'Tahan', none: 'Belum dinilai' };
const TEMP_LABEL = { ok: 'Normal', stop: 'Ada anomali', none: 'Belum diperiksa' };
const status = (level, label) => `<span class="status" data-level="${level}">${label}</span>`;
const CALM = 'Menu sudah seimbang';

// Model dilatih sekali saat halaman dibuka (sekitar satu detik).
const nutriModel = trainNutritionModel();
const riskModel = trainRiskModel();

const DEFAULT_MENU = [['Nasi Putih', 200], ['Ayam Goreng', 80], ['Capcay Kuah', 80], ['Tempe Goreng', 40], ['Pisang Ambon', 80]];
const state = {
  menu: DEFAULT_MENU.map(([n, g]) => ({ food: foodByName(n), gram: g })),
  nutrition: null, safety: null, temp: null,
};

/* ---------- Navigasi ---------- */
function show(view) {
  if (!$('#view-' + view)) view = 'ringkasan';
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  history.replaceState(null, '', '#' + view);
}
$('#nav').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) show(b.dataset.view);
});
document.addEventListener('click', (e) => {            // tombol di halaman yang berpindah tab
  const b = e.target.closest('[data-go]');
  if (b) show(b.dataset.go);
});

/* ---------- Gizi menu ---------- */
$('#food-select').innerHTML = FOODS.map((f, i) => `<option value="${i}">${f.nama}</option>`).join('');

$('#food-add').addEventListener('click', () => {
  const gram = Number($('#food-gram').value);
  if (!(gram > 0)) return;
  state.menu.push({ food: FOODS[Number($('#food-select').value)], gram });
  renderMenu();
});
$('#menu-reset').addEventListener('click', () => {
  state.menu = DEFAULT_MENU.map(([n, g]) => ({ food: foodByName(n), gram: g }));
  renderMenu();
});
$('#menu-body').addEventListener('click', (e) => {
  const b = e.target.closest('[data-remove]');
  if (!b) return;
  state.menu.splice(Number(b.dataset.remove), 1);
  renderMenu();
});

const TARGETS = [
  { label: 'Energi', key: 'kkal', unit: 'kkal', goal: 700 },
  { label: 'Protein', key: 'protein', unit: 'g', goal: 23 },
  { label: 'Karbohidrat', key: 'karbo', unit: 'g', goal: 110 },
  { label: 'Serat', key: 'serat', unit: 'g', goal: 10 },
  { label: 'Lemak (batas atas)', key: 'lemak', unit: 'g', goal: 25, max: true },
];

function renderMenu() {
  const rows = state.menu.map((m, i) => {
    const k = m.gram / 100;
    return `<tr><td>${m.food.nama}</td><td class="num">${m.gram}</td><td class="num">${fmt(m.food.kkal * k)}</td>
      <td class="num">${fmt(m.food.protein * k, 1)}</td><td class="num">${fmt(m.food.lemak * k, 1)}</td>
      <td class="num">${fmt(m.food.serat * k, 1)}</td><td><button class="link" data-remove="${i}">Hapus</button></td></tr>`;
  });
  $('#menu-body').innerHTML = rows.join('') ||
    '<tr><td colspan="7" class="empty">Menu masih kosong. Pilih makanan lalu tekan Tambah ke menu.</td></tr>';

  const t = sumMenu(state.menu);
  $('#menu-foot').innerHTML = `<tr><th>Total</th><td></td><td class="num">${fmt(t.kkal)}</td>
    <td class="num">${fmt(t.protein, 1)}</td><td class="num">${fmt(t.lemak, 1)}</td><td class="num">${fmt(t.serat, 1)}</td><td></td></tr>`;

  const level = nutritionLevel(t);
  const pred = nutriModel.net.predict(nutritionInput(t));
  const predLevel = LEVELS[pred.label];
  state.nutrition = { t, level, recs: recommendations(t) };

  $('#nutri-result').innerHTML = `
    <p>Keputusan berdasarkan aturan: ${status(level, NUTRI_LABEL[level])}</p>
    <p>Prediksi jaringan saraf: ${status(predLevel, NUTRI_LABEL[predLevel])}
       (keyakinan ${fmt(pred.p[pred.label] * 100)}%)</p>
    ${predLevel !== level ? '<p class="note">Prediksi berbeda dari aturan. Keputusan tetap mengikuti aturan; menu ini kemungkinan dekat ambang batas.</p>' : ''}
    <h3>Rekomendasi</h3><ul>${recommendations(t).map((r) => `<li>${r}</li>`).join('')}</ul>`;

  $('#target-bars').innerHTML = TARGETS.map((g) => {
    const v = t[g.key], pct = (v / g.goal) * 100;
    const cls = g.max ? (pct > 100 ? 'over' : '') : (pct < 70 ? 'low' : '');
    return `<div class="target"><div class="target-head"><span>${g.label}</span>
      <span>${fmt(v, 1)} dari ${g.goal} ${g.unit} (${fmt(pct)}%)</span></div>
      <div class="bar"><i class="${cls}" style="width:${Math.min(pct, 100)}%"></i></div></div>`;
  }).join('') + '<p class="note">Target di atas adalah angka demonstrasi (sekitar 30% AKG remaja 13-15 tahun). Verifikasi dengan tabel AKG resmi sebelum dipakai.</p>';

  renderSummary();
}

/* ---------- Keamanan pangan ---------- */
$('#safety-run').addEventListener('click', () => {
  const input = {
    suhuSimpan: Number($('#suhu-simpan').value), jam: Number($('#jam').value),
    suhuSaji: Number($('#suhu-saji').value), berisiko: $('#berisiko').checked,
    higiene: document.querySelectorAll('.higiene:checked').length,
  };
  const p = riskModel.predict(riskFeatures(input));
  const { findings, hard } = hazardChecks(input);
  const level = hard || p >= 0.6 ? 'stop' : p >= 0.3 || findings.length ? 'watch' : 'ok';
  state.safety = { p, level, findings };

  const action = { stop: 'Tahan distribusi dan lakukan tindakan korektif sebelum disajikan.',
                   watch: 'Boleh dilanjutkan dengan pengawasan. Perbaiki temuan di atas.',
                   ok: 'Aman untuk disajikan.' }[level];
  $('#safety-result').innerHTML = `
    <h3>Hasil</h3>
    <p>${status(level, SAFE_LABEL[level])} Risiko menurut model: ${fmt(p * 100)}%</p>
    <h3>Pelanggaran aturan</h3>
    <ul>${(findings.length ? findings : ['Tidak ada pelanggaran aturan.']).map((f) => `<li>${f}</li>`).join('')}</ul>
    <p><strong>Tindakan:</strong> ${action}</p>`;
  renderSummary();
});

function fillTemp(faulty) { $('#temp-input').value = simulate(faulty).join(', '); }
$('#temp-normal').addEventListener('click', () => fillTemp(false));
$('#temp-fault').addEventListener('click', () => fillTemp(true));
$('#temp-run').addEventListener('click', () => {
  const values = parseReadings($('#temp-input').value);
  if (values.length < 8) {
    $('#temp-result').innerHTML = '<p class="note">Masukkan minimal 8 pembacaan suhu.</p>';
    return;
  }
  const results = detect(values);
  const count = results.filter((r) => r.anomaly).length;
  state.temp = { count, total: values.length };
  $('#temp-result').innerHTML = renderChart(results) +
    `<p>${status(count ? 'stop' : 'ok', TEMP_LABEL[count ? 'stop' : 'ok'])}
     ${count ? `${count} titik melewati 5 °C atau menyimpang jauh dari tren 6 jam terakhir. Periksa kompresor, pintu, dan listrik.`
             : 'Seluruh pembacaan stabil di bawah batas.'}</p>`;
  renderSummary();
});

/* ---------- Ringkasan ---------- */
function renderSummary() {
  const g = state.nutrition, s = state.safety, t = state.temp;
  const sl = s ? s.level : 'none', tl = t ? (t.count ? 'stop' : 'ok') : 'none';

  $('#tile-gizi-status').innerHTML = status(g.level, NUTRI_LABEL[g.level]);
  $('#tile-gizi-detail').textContent = `${fmt(g.t.kkal)} kkal, protein ${fmt(g.t.protein, 1)} g, lemak ${fmt(g.t.lemak, 1)} g`;
  $('#tile-safe-status').innerHTML = status(sl, SAFE_LABEL[sl]);
  $('#tile-safe-detail').textContent = s ? `Risiko menurut model ${fmt(s.p * 100)}%` : 'Belum ada penilaian batch.';
  $('#tile-temp-status').innerHTML = status(tl, TEMP_LABEL[tl]);
  $('#tile-temp-detail').textContent = t ? `${t.count} anomali dari ${t.total} pembacaan` : 'Log suhu belum diperiksa.';

  $('#menu-mini').innerHTML = state.menu.map((m) =>
    `<tr><td>${m.food.nama}</td><td class="num">${m.gram} g</td><td class="num">${fmt(m.food.kkal * m.gram / 100)} kkal</td></tr>`).join('') ||
    '<tr><td colspan="3" class="empty">Menu masih kosong.</td></tr>';

  const tasks = [];
  if (!s) tasks.push('Nilai keamanan batch di tab Keamanan pangan.');
  if (s) tasks.push(...s.findings);
  if (!t) tasks.push('Periksa log suhu lemari dingin.');
  else if (t.count) tasks.push(`Periksa lemari dingin: ${t.count} pembacaan suhu tidak normal.`);
  tasks.push(...g.recs.filter((r) => !r.startsWith(CALM)));
  $('#actions').innerHTML = (tasks.length ? tasks : ['Tidak ada tindakan. Semua pemeriksaan lolos.'])
    .map((x) => `<li>${x}</li>`).join('');

  let level = 'ok', title = 'Layak saji', text = 'Gizi memenuhi standar dan tidak ada temuan keamanan pangan.';
  if (g.level === 'stop' || sl === 'stop') {
    level = 'stop'; title = 'Tahan distribusi';
    text = 'Ada indikator merah pada gizi atau keamanan pangan. Selesaikan sebelum makanan dibagikan.';
  } else if (g.level === 'watch' || !s || sl === 'watch' || (t && t.count)) {
    level = 'watch'; title = 'Perlu ditinjau';
    text = !s ? 'Penilaian keamanan pangan belum dilakukan.' : 'Ada catatan yang perlu ditinjau sebelum distribusi.';
  }
  $('#verdict').dataset.level = level;
  $('#verdict-title').textContent = title;
  $('#verdict-text').textContent = text;
}

/* ---------- Model dan evaluasi ---------- */
function renderModels() {
  const n = nutriModel, r = riskModel, names = ['Memenuhi', 'Perlu perbaikan', 'Tidak memenuhi'];
  $('#model-info').innerHTML = `
    <h2>Jaringan saraf: status gizi</h2>
    <p>Arsitektur 4-8-3 (tanh, softmax). Masukan: kalori, protein, lemak, serat. Dilatih dari ${n.nTrain} sampel sintetis
       yang dilabeli aturan gizi, diuji pada ${n.nTest} sampel terpisah. Akurasi uji: <strong>${fmt(n.accuracy * 100, 1)}%</strong>.</p>
    <table class="ledger"><thead><tr><th>Sebenarnya \\ Prediksi</th>${names.map((x) => `<th class="num">${x}</th>`).join('')}</tr></thead>
    <tbody>${n.confusion.map((row, i) => `<tr><td>${names[i]}</td>${row.map((v) => `<td class="num">${v}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <h2>Regresi logistik: risiko keamanan pangan</h2>
    <p>Dilatih dari ${r.nTrain} sampel sintetis, diuji pada ${r.nTest} sampel. Akurasi <strong>${fmt(r.accuracy * 100, 1)}%</strong>,
       presisi ${fmt(r.precision * 100, 1)}%, recall ${fmt(r.recall * 100, 1)}%. Label dibangkitkan dari rumus buatan ditambah noise,
       jadi angka ini menunjukkan seberapa baik model menebak rumus itu.</p>
    <table class="ledger"><thead><tr><th>Fitur</th><th class="num">Bobot</th></tr></thead><tbody>
      ${['Lama paparan zona bahaya', 'Bahan berisiko tinggi', 'Higiene tidak terpenuhi', 'Suhu saji rendah']
        .map((f, i) => `<tr><td>${f}</td><td class="num">${fmt(r.weights[i], 2)}</td></tr>`).join('')}
    </tbody></table>
    <h2>Keterbatasan</h2>
    <ul>
      <li>Data latih sintetis. Model belum pernah melihat data dapur nyata.</li>
      <li>Keputusan akhir selalu mengikuti aturan pakar; model hanya memberi sinyal tambahan.</li>
      <li>Basis pangan hanya 25 menu umum, nilai per 100 g.</li>
      <li>Perlu validasi oleh ahli gizi atau petugas sanitasi sebelum dipakai di lapangan.</li>
    </ul>`;
}

/* ---------- Mulai ---------- */
fillTemp(false);
renderMenu();
renderModels();
$('#safety-run').click();
$('#temp-run').click();
show(location.hash.slice(1) || 'ringkasan');