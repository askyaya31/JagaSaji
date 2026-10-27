// Nilai gizi per 100 g: [nama, kkal, protein, karbo, lemak, serat]
// Sumber awal: food_database.json milik proyek desktop NutriSense+ sebelumnya.
const RAW = [
  ["Nasi Putih", 130, 2.7, 28.2, 0.3, 0.4],
  ["Nasi Merah", 110, 2.8, 22.8, 0.9, 1.8],
  ["Ayam Goreng", 246, 23.3, 1.2, 16.5, 0.1],
  ["Ayam Bakar", 200, 24.5, 3.1, 10.5, 0.2],
  ["Telur Rebus", 155, 12.6, 1.1, 10.6, 0],
  ["Telur Dadar", 180, 11, 1.5, 15, 0],
  ["Ikan Kembung Goreng", 165, 21, 0, 8.5, 0],
  ["Ikan Lele Goreng", 220, 17.5, 4, 14.5, 0.1],
  ["Rendang Sapi", 195, 22, 6.5, 11.5, 0.5],
  ["Opor Ayam", 230, 18, 5, 15, 0.5],
  ["Tempe Goreng", 225, 18, 10, 14, 4.5],
  ["Tahu Goreng", 115, 9, 2.5, 8.5, 1],
  ["Tumis Kangkung", 60, 2.5, 4, 4.5, 2],
  ["Sayur Bayam Bening", 25, 2, 4, 0.2, 2.2],
  ["Sayur Sop", 45, 3.5, 5, 1.5, 1.5],
  ["Capcay Kuah", 65, 3, 6, 3.5, 2.5],
  ["Sayur Lodeh", 95, 3, 8, 6, 2.5],
  ["Pisang Ambon", 97, 1.3, 24.8, 0.3, 2.5],
  ["Pepaya", 43, 0.5, 10.8, 0.3, 1.7],
  ["Jeruk Manis", 47, 0.9, 11.8, 0.1, 2.4],
  ["Semangka", 30, 0.6, 7.6, 0.2, 0.4],
  ["Susu Sapi Segar", 61, 3.2, 4.8, 3.3, 0],
  ["Mie Goreng", 185, 4.5, 25, 7.5, 1.2],
  ["Nugget Ayam Goreng", 296, 14.5, 18, 19.5, 1],
  ["Sosis Sapi Goreng", 300, 12, 5, 26, 0],
];

export const FOODS = RAW.map(([nama, kkal, protein, karbo, lemak, serat]) => ({
  nama, kkal, protein, karbo, lemak, serat,
}));

export const foodByName = (nama) => FOODS.find((f) => f.nama === nama);