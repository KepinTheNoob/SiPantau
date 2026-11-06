# Foto seed (opsional)

`pnpm db:seed` mengisi galeri setiap proyek demo. Tanpa isi folder ini, seed
membuat gambar placeholder bergaris dengan keterangan "Foto demo (placeholder)".

Untuk memakai foto asli, buat folder dengan nama slug proyek lalu taruh fotonya:

```
scripts/seed-images/
  demo-flyover-simpang-tanjung-barat/
    01-pilar-selesai.jpg      <- file pertama jadi foto sampul
    02-pengecoran-girder.jpg
```

- Format: JPG, PNG, atau WebP. Urutan mengikuti nama file.
- Keterangan foto diambil dari nama file (angka di depan dibuang).
- Pakai hanya foto yang kamu punya hak untuk menggunakannya.
- Foto bukti tahapan selalu memakai placeholder.
