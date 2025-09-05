# Among Us – English Club (Fixed 6, final)
- 10 ronde, 10 tema berbeda (>=20 kata per ronde total)
- Tanpa payload per ronde — Share link Player sekali: `?mode=player&room=<code>&auto=1`
- Player cukup Refresh saat Admin pindah ronde (auto-advance lokal)
- Min pemain: 2, Maks pemain: 20
- Impostor: min 1, maks 2 (otomatis disesuaikan jika pemain hanya 2)
- Admin: pilih ronde 1–10 dan jumlah impostor; lihat assignment
- Player: masukkan nama & roster sekali (copy dari Admin), lalu Refresh tiap ronde
Build: `vite build` → `dist/`
Deploy: Vercel (Install OFF, Build `vite build`, Output `dist`).
