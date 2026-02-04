# DICOCHAT

Real-time ochiq chat platformasi.

## Xususiyatlari
- **Taxallus bilan kirish:** Ro'yxatdan o'tish shart emas.
- **Real-time Chat:** Socket.io orqali tezkor muloqot.
- **XP Tizimi:** Har bir xabar uchun +1 XP (2 soniya vaqt limiti bilan).
- **Admin Panel:** Foydalanuvchilarni bloklash, XP ni nolga tushirish, tizim e'lonlarini yuborish.
- **Dark Mode:** Zamonaviy va qulay interfeys.
- **O'zbek tilida:** To'liq o'zbekcha interfeys.

## Texnologiyalar
- Frontend: HTML, CSS, JavaScript (Vanilla)
- Backend: Node.js, Express
- Real-time: Socket.IO
- Ma'lumotlar bazasi: MongoDB (Mongoose)
- Xavfsizlik: Helmet, XSS-clean, Express-sessions

## O'rnatish
1. Loyalarni yuklab oling.
2. MongoDB o'rnatilganligiga va ishlayotganligiga ishonch hosil qiling.
3. Kerakli paketlarni o'rnating:
   ```bash
   npm install
   ```
4. `.env` faylini sozlang (agar kerak bo'lsa):
   - `PORT`: Server porti (standart: 3000)
   - `MONGODB_URI`: MongoDB ulanish manzili
   - `ADMIN_CODE`: Admin panelga kirish kodi (default: 1212)

## Ishga tushirish
```bash
node server.js
```
Keyin brauzerda `http://localhost:3000` manziliga kiring.

## Admin Panel
Manzil: `http://localhost:3000/admin-login.html`
Kod: `1212`

## Litsenziya
MIT
