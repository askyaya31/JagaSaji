// Aturan pakar: lapisan keputusan utama. Model ML/DL tidak boleh menimpa file ini.

/** Jumlahkan gizi seluruh item menu. items: [{ food, gram }] */
export function sumMenu(items) {
  const total = { kkal: 0, protein: 0, karbo: 0, lemak: 0, serat: 0 };
  for (const { food, gram } of items) {
    const k = gram / 100;
    for (const key of Object.keys(total)) total[key] += food[key] * k;
  }
  return total;
}

/** Ambang dari GiziBalanceTracker versi desktop. Hasil: 'ok' | 'watch' | 'stop' */
export function nutritionLevel(t) {
  if (t.kkal < 500 || t.protein < 15 || t.lemak > 30) return 'stop';
  if (t.kkal < 600 || t.protein < 23 || t.lemak > 25) return 'watch';
  return 'ok';
}

/** Rekomendasi perbaikan menu (diadaptasi dari SmartRecommendationEngine). */
export function recommendations(t) {
  const out = [];
  if (t.kkal < 500) out.push('Kalori rendah: tambahkan nasi, roti, atau kentang.');
  if (t.kkal > 800) out.push('Kalori terlalu tinggi: kurangi porsi karbohidrat.');
  if (t.protein < 23) out.push('Protein kurang: tambahkan ayam, telur, ikan, atau tempe.');
  if (t.lemak > 25) out.push('Lemak berlebih: ganti gorengan dengan bakar atau rebus, kurangi santan.');
  if (t.serat < 5) out.push('Serat rendah: tambahkan sayur atau buah.');
  return out.length ? out : ['Menu sudah seimbang. Tidak ada rekomendasi tambahan.'];
}

/** Aturan keamanan pangan: zona bahaya 5-60 °C, batas 2 jam dan 4 jam. */
export function hazardChecks({ suhuSimpan, jam, suhuSaji, higiene }) {
  const findings = [];
  let hard = false;
  const inZone = suhuSimpan > 5 && suhuSimpan < 60;
  if (inZone && jam > 4) {
    findings.push('Berada di zona bahaya suhu (5-60 °C) lebih dari 4 jam. Makanan harus dibuang.');
    hard = true;
  } else if (inZone && jam > 2) {
    findings.push('Berada di zona bahaya suhu lebih dari 2 jam. Segera sajikan atau panaskan ulang hingga minimal 74 °C.');
  }
  if (suhuSaji > 5 && suhuSaji < 60) {
    findings.push(`Suhu saji ${suhuSaji} °C berada di zona bahaya. Makanan panas harus minimal 60 °C, makanan dingin maksimal 5 °C.`);
  }
  if (higiene < 5) findings.push(`Checklist higiene belum lengkap (${higiene} dari 5).`);
  return { findings, hard };
}