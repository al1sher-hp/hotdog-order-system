# Tuzatishlar hisoboti

`AUDIT.md`da aniqlangan 6 ta band (K5, K1, K2, K3, K4, M6) shu sessiyada tuzatildi. Boshqa hech narsaga (masalliqlar/ombor moduli, boshqa MUHIM/YAXSHILASH bandlari) tegilmadi.

---

## K5 — `.gitignore` qo'shildi

**Fayl:** `.gitignore` (yangi)

`.env`, `node_modules/`, `client/build/` endi commit qilinmaydi. `.env` fayli mavjud git tarixida topilmadi, shuning uchun tarixni qayta yozish (BFG/filter-branch) talab qilinmadi.

**Qo'lda tekshirish:**
```bash
echo "test" > .env
git status --short   # .env ro'yxatda ko'rinmasligi kerak
rm .env
```

---

## K1 — Buyurtma narxi/summasi endi serverda hisoblanadi

**Fayllar:** `server/routes/orders.js`, `client/src/components/MijozSavat.js`

`POST /api/create-order` endi mijozdan faqat `{ ism, items: [{ _id, quantity }] }` qabul qiladi. Narx va summa har doim `Menu` kolleksiyasidagi joriy qiymatlardan serverda hisoblanadi. Menyuda topilmagan `_id` yoki noto'g'ri miqdor kelsa — `400` xato qaytariladi.

**Qo'lda tekshirish (haqiqiy MongoDB bilan):**
```bash
# 1. Avval /api/get-menu orqali biror mahsulotning _id va narxini oling
curl http://localhost:5000/api/get-menu

# 2. O'sha _id bilan, lekin boshqa (soxta) narx yuborib ko'ring — endi e'tiborga olinmaydi
curl -X POST http://localhost:5000/api/create-order \
  -H "Content-Type: application/json" \
  -d '{"ism":"Test","items":[{"_id":"<menu_item_id>","quantity":2,"price":1}]}'
# Javobdagi order summasi client yuborgan "price":1 emas, Menu'dagi haqiqiy narxga teng bo'lishi kerak

# 3. Mavjud bo'lmagan _id yuboring — 400 va "Menyuda topilmadi" xabari kelishi kerak
curl -X POST http://localhost:5000/api/create-order \
  -H "Content-Type: application/json" \
  -d '{"ism":"Test","items":[{"_id":"yoq-bunday-id","quantity":1}]}'
```
Frontend orqali: mijoz sifatida oddiy tartibda buyurtma bering (menyu → savat → buyurtma berish) — avvalgidek ishlashi kerak, farqi yo'q (chunki narxlar mos keladi).

---

## K2 — Default admin uchun majburiy parol almashtirish

**Fayllar:** `server/models/User.js`, `server/app.js`, `server/routes/auth.js`, `client/src/components/HodimLogin.js`, `client/src/components/BoshliqLogin.js`

- `User` modeliga `mustChangePassword` (Boolean, default `false`) qo'shildi.
- Server birinchi marta ishga tushib, default admin (`boshliq`/`admin123`) yaratganda `mustChangePassword: true` qo'yiladi.
- Login javobida `mustChangePassword` qaytariladi.
- Yangi endpoint: `POST /api/auth/change-password` (`{ currentPassword, newPassword }`, `authMiddleware` bilan himoyalangan, yangi parol kamida 6 belgi bo'lishi kerak).
- Login sahifalarida (`Hodim` va `Boshliq`) agar `mustChangePassword: true` qaytsa, dashboard'ga o'tish o'rniga parol almashtirish oynasi ko'rsatiladi; parol muvaffaqiyatli almashtirilgandan keyingina dashboard'ga o'tiladi.

**Qo'lda tekshirish:**
1. Ma'lumotlar bazasini bo'shatib (yoki yangi bazada) serverni birinchi marta ishga tushiring — konsolda "Default admin yaratildi: boshliq / admin123" chiqadi.
2. `/boshliq` sahifasida `boshliq` / `admin123` bilan kiring.
3. Dashboard o'rniga "Yangi parol o'rnating" oynasi chiqishi kerak.
4. Yangi parolni kiritib tasdiqlang — muvaffaqiyatli bo'lsa, Boshliq Dashboard ochiladi.
5. Chiqib, yana `boshliq` / eski `admin123` bilan kirishga urinib ko'ring — endi "Noto'g'ri username yoki parol" chiqishi kerak; yangi parol bilan esa to'g'ridan-to'g'ri dashboardga kirishi kerak (parol almashtirish oynasi endi chiqmaydi).

**Ma'lum chegara:** Bu tekshiruv faqat login formasida ishlaydi. Agar foydalanuvchi parolni almashtirmasdan (masalan yangi bir tabda) to'g'ridan-to'g'ri `/boshliq/dashboard` manziliga o'tsa va localStorage'da avvalgi token/rol saqlangan bo'lsa, dashboard shu tokenni ko'rib kiritib yuboradi — server buni bloklamaydi, chunki JWT ichida `mustChangePassword` maydoni yo'q. Bu holatni to'liq yopish uchun kelajakda alohida ish kerak bo'ladi (masalan, dashboard yuklanganda `/api/auth/verify`ni kengaytirib shu flagni ham qaytarish va tekshirish).

---

## K3 — `mark-as-given` autentifikatsiya talab qiladi; Ekran endi faqat ko'rsatish sahifasi

**Fayllar:** `server/routes/orders.js`, `client/src/components/Ekran.js`

`POST /api/mark-as-given/:id` endi `authMiddleware` talab qiladi — tashqi, login qilmagan hech kim buyurtma holatini o'zgartira olmaydi. Ekran (TV) sahifasi login qilmasligi sababli bu endpointni endi chaqira olmaydi — shuning uchun Ekran'dagi avtomatik chaqiruv (60 soniyadan keyin "tayyor" buyurtmani "berilgan" qilib belgilash) butunlay olib tashlandi. Ekran endi faqat `/api/active-orders`ni o'qiydigan va Socket.io orqali yangilanadigan **ko'rsatish (display-only)** sahifasi.

**Muhim xatti-harakat o'zgarishi:** Avval "tayyor" buyurtmalar 60 soniyadan keyin ekrandan avtomatik yo'qolib, `berilgan` holatiga o'tar edi. Endi buni qiladigan hech qanday joy yo'q — buyurtmalar `tayyor` holatida (va Ekranda ko'rinishda) qolaveradi, toki kimdir ularni boshqa yo'l bilan (masalan to'g'ridan-to'g'ri API chaqiruvi bilan, authMiddleware orqali) `berilgan`ga o'tkazmaguncha. Hozircha buni qiladigan hodim-panel tugmasi yo'q. Bu ataylab shunday qoldirildi (foydalanuvchi tasdiqlagan qaror) — kelajakda alohida band sifatida hal qilinishi kerak (masalan hodim panelida "Berildi" tugmasi qo'shish, yoki serverda avtomatik timer).

**Qo'lda tekshirish:**
```bash
# Auth'siz chaqiruv endi 401 qaytarishi kerak
curl -X POST http://localhost:5000/api/mark-as-given/<order_id>
# -> {"error":"Token topilmadi"}

# Auth bilan (hodim/admin token) ishlashi kerak
curl -X POST http://localhost:5000/api/mark-as-given/<order_id> \
  -H "Authorization: Bearer <token>"
```
Frontend orqali: `/ekran` sahifasini oching, tarmoq so'rovlarini kuzating (brauzer DevTools → Network) — `mark-as-given` so'rovi endi umuman yuborilmasligini tasdiqlang.

---

## K4 — `complete-order` holat o'tishini tekshiradi

**Fayl:** `server/routes/orders.js`

`POST /api/complete-order/:id` endi faqat `tayyorlanmoqda` holatidagi buyurtmani `tayyor`ga o'tkazadi. Boshqa holatda (`pending`, `tayyor`, `berilgan`) — `400` va tushunarli xabar (`"Buyurtma hali tasdiqlanmagan yoki allaqachon tayyor"`) qaytaradi.

**Qo'lda tekshirish:**
```bash
# Yangi (hali tasdiqlanmagan, "pending") buyurtmani to'g'ridan-to'g'ri "tayyor" qilishga urinib ko'ring
curl -X POST http://localhost:5000/api/complete-order/<pending_order_id> \
  -H "Authorization: Bearer <token>"
# -> 400 "Buyurtma hali tasdiqlanmagan yoki allaqachon tayyor"

# Avval confirm-order bilan tasdiqlang, keyin complete-order chaqiring — endi ishlashi kerak
curl -X POST http://localhost:5000/api/confirm-order/<order_id> -H "Authorization: Bearer <token>"
curl -X POST http://localhost:5000/api/complete-order/<order_id> -H "Authorization: Bearer <token>"
# -> 200 { success: true, order: {...} }
```

---

## M6 — ESLint `no-useless-escape` xatosi tuzatildi

**Fayl:** `client/src/components/BoshliqDashboard.js:163`

Keraksiz `\'` escape belgisi olib tashlandi. Tasdiqlash uchun `CI=true npm run build` sinovdan o'tkazildi — avval bu build butunlay muvaffaqiyatsiz tugagan edi (`Failed to compile`), endi "Compiled successfully" bilan yakunlanadi.

**Qo'lda tekshirish:**
```bash
cd client
CI=true npm run build
# -> "Compiled successfully." (ogohlantirish yoki xatosiz)
```

---

## Umumiy eslatma

Bu sessiyada ham (avvalgi audit sessiyasidagi kabi) sandboxda haqiqiy MongoDB'ga ulanish imkoni bo'lmagani sababli (tarmoq siyosati `fastdl.mongodb.org` va MongoDB Atlas'ni bloklaydi, lokal `mongod`/`docker` mavjud emas), o'zgarishlar quyidagicha tekshirildi:
- Barcha o'zgargan backend fayllari `node -c` bilan sintaksis jihatdan tekshirildi.
- Frontend `CI=true npm run build` bilan muvaffaqiyatli build qilindi.
- Har bir endpoint/oqim mantiqiy jihatdan (kod darajasida) qayta ko'rib chiqildi.

Yuqoridagi "Qo'lda tekshirish" bo'limlaridagi `curl` misollarini haqiqiy MongoDB (lokal yoki Atlas) ulangan holda ishga tushirib, real ma'lumotlar bilan qayta tasdiqlash tavsiya etiladi.
