# Model card: JagaSaji

## Model 1: klasifikasi status gizi (MLP 4-8-3)
- Tujuan: memprediksi status Memenuhi / Perlu perbaikan / Tidak memenuhi.
- Data: 900 latih dan 300 uji, sintetis, dilabeli aturan gizi (ambang kalori, protein, lemak).
- Hasil: akurasi uji ~96%. Kesalahan terkonsentrasi pada menu dekat ambang batas.
- Keterbatasan: label berasal dari aturan yang sama, jadi model hanya menirukan aturan.
  Tidak menambah kemampuan baru dan tidak boleh menggantikan aturan.

## Model 2: risiko keamanan pangan (regresi logistik)
- Tujuan: probabilitas batch berisiko dari paparan zona bahaya, bahan berisiko, higiene, suhu saji.
- Data: 1500 latih dan 500 uji, sintetis, label dari rumus buatan + noise.
- Hasil: akurasi ~75%, presisi ~78%, recall ~82%.
- Keterbatasan: tidak mewakili data lapangan. Bobot fitur mencerminkan rumus pembuat data.

## Deteksi anomali suhu
- Metode: rolling z-score (jendela 6, ambang 3 simpangan baku) + batas mutlak 5 °C.
- Parameter dikalibrasi pada data simulasi; perlu dikalibrasi ulang pada sensor nyata.

## Penggunaan yang dimaksud dan yang tidak
- Dimaksud: demonstrasi arsitektur sistem pendukung keputusan.
- Tidak dimaksud: keputusan keamanan pangan sesungguhnya tanpa validasi ahli gizi/sanitarian.

## Langkah berikutnya
- Ganti data sintetis dengan data historis dapur (hasil uji sampel, log suhu, laporan keluhan).
- Tambah klasifikasi foto makanan (lihat README).