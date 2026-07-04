# Hot Dog Buyurtma Tizimi — Sotuvga Tayyorlash Auditi

**Sana:** 2026-07-04
**Maqsad:** Loyihani kichik fast-food do'konlariga sotiladigan mahsulot sifatida baholash.
**Ko'lam:** Kod o'zgartirilmadi — faqat o'rganish, ishga tushirish va qo'lda/statik tekshiruv.

---

## 0. Muhim eslatma — test muhiti cheklovi

Bu sandbox muhitida tashqi tarmoqqa faqat cheklangan proxy orqali chiqiladi. `fastdl.mongodb.org` (mongodb-memory-server uchun) va MongoDB Atlas'ga to'g'ridan-to'g'ri ulanish **tarmoq siyosati tomonidan bloklangan** (403), lokal `mongod`/`docker` mavjud emas. Shu sababli:

- Backend (`npm install` + `node server/app.js`) va frontend (`npm install` + `npm run build`) **haqiqatda ishga tushirildi va sinovdan o'tkazildi**.
- `/health` kabi DB talab qilmaydigan endpointlar **jonli tekshirildi**.
- DB talab qiladigan endpointlar (`/api/get-menu`, `/api/create-order` va h.k.) jonli chaqirilganda, kutilganidek, Mongo ulanmagani sababli 10 soniyadan keyin timeout bilan xato qaytardi — bu **sandbox cheklovi, kod xatosi emas**.
- Shu sabab pastdagi ISHLAYDI/QISMAN/BUZUQ baholari **to'liq kod-yo'l tahlili (request→route→model→response, va frontendning aynan shu javobni qanday ishlatishi)** asosida berilgan, real MongoDB bilan uchdan-uchgacha (end-to-end) ijro emas. Buni sotishdan oldin haqiqiy MongoDB (lokal yoki Atlas) bilan qayta tekshirish tavsiya etiladi.

---

## 1. Loyiha qanday ishlaydi (arxitektura)

```
[Mijoz brauzeri] --(REST, auth yo'q)--> /api/get-menu, /api/create-order
[Hodim brauzeri] --(REST, JWT)--------> /api/get-order/:id, /api/confirm-order/:id, /api/complete-order/:id
[Boshliq brauzeri]--(REST, JWT+admin)-> /api/admin/*, /api/add-item, /api/add-section, ...
[TV/Ekran]       --(REST, auth yo'q)--> /api/active-orders, /api/mark-as-given/:id

Barcha rollar ---(Socket.io, autentifikatsiyasiz global broadcast)---> order-update, menu-update
```

- **Backend**: `server/app.js` — Express + Socket.io bitta HTTP serverda. MongoDB'ga ulanadi, ulanganda `boshliq/admin123` default adminini avtomatik yaratadi. Route'lar: `auth.js` (login/verify), `orders.js` (mijoz+hodim+ekran), `menu.js` (ommaviy o'qish, admin yozish), `admin.js` (statistika, hodimlar, masalliqlar — hammasi admin-only).
- **Auth**: `bcrypt` bilan parol hash, `jsonwebtoken` bilan 24 soatlik token, `middleware/auth.js` orqali `authMiddleware` (token tekshiradi) va `adminMiddleware` (rol tekshiradi).
- **Ma'lumot modeli**: `User` (username/password/role), `Menu` (bo'limlar ichida mahsulotlar, har birida ixtiyoriy `recipe`), `Order` (id, ism, items, total, status: pending→tayyorlanmoqda→tayyor→berilgan), `Ingredient` (nom bo'yicha qoldiq).
- **Frontend**: React + react-router. Mijoz oqimi holatni **localStorage**da saqlaydi (ism, savat, QR). Hodim/Boshliq token'ni ham localStorage'da saqlaydi. Real-time yangilanish uchun har bir dashboard mustaqil `socket.io-client` ulanishi ochadi.
- **Real-time**: Server har qanday buyurtma/menyu o'zgarishida global `io.emit(...)` qiladi (xona/namespace yo'q) — barcha ulangan klientlar hamma voqeadan xabardor bo'ladi.

---

## 2. KRITIK muammolar — sotishdan oldin majburiy

| # | Muammo | Fayl | Tavsif | Hajm |
|---|--------|------|--------|------|
| K1 | **Narxni mijoz belgilaydi** | `server/routes/orders.js:9-37` | `POST /api/create-order` `items[].price` va `total`ni to'g'ridan-to'g'ri, menyudagi haqiqiy narxlar bilan solishtirmasdan saqlaydi. Brauzer devtools yoki Postman orqali so'rovni o'zgartirib, istalgan mahsulotni **istalgan (hatto 0 yoki manfiy) narxda** buyurtma qilish mumkin. Bu to'g'ridan-to'g'ri moliyaviy firibgarlik kanali. | M — narxni serverda `Menu` kolleksiyasidan `_id` bo'yicha qayta hisoblash kerak |
| K2 | **Default admin parol — ochiq va avto-yaratiladi** | `server/app.js:56-69`, `README.md:95-96` | Server birinchi marta ishga tushganda `boshliq/admin123` adminini avtomatik yaratadi; bu login ommaviy README'da ham yozilgan. Do'kon egasi buni o'zgartirmasa (ehtimoli yuqori), **har kim internetdan shu username/parolni topib to'liq admin huquqiga ega bo'ladi** (hodim qo'shish/o'chirish, menyu, statistika). | S — birinchi kirishda majburiy parol o'zgartirish oqimi qo'shish |
| K3 | **Auth'siz holat o'zgartiruvchi endpoint** | `server/routes/orders.js:129` (`POST /api/mark-as-given/:id`) | Hech qanday token talab qilinmaydi. `id` oddiy `Date.now()` qiymati bo'lgani uchun taxmin qilish oson. Har qanday tashqi odam (hatto tarmoqqa faqat kirish huquqiga ega bo'lgan kishi) ixtiyoriy buyurtmani "berilgan" deb belgilab, uni ekrandan va hodim ro'yxatidan yo'qotib yuborishi mumkin. | S — bu yo'lni ichki chaqiruv (masalan maxsus token/ички tarmoq) yoki vaqt asosidagi imzo bilan himoyalash |
| K4 | **Buyurtma holati o'tishlari serverda tekshirilmaydi** | `server/routes/orders.js:94-112` (`POST /api/complete-order/:id`) | `confirm-order` `status === 'pending'` ekanini tekshiradi, lekin `complete-order` **hech qanday joriy holatni tekshirmaydi** — pul hali olinmagan (`pending`) buyurtmani ham to'g'ridan-to'g'ri "tayyor" qilish mumkin, bu kassa/hisobot buzilishiga olib keladi. | S — status maqsadli qiymatga o'tishdan oldin joriy holatni tekshirish |
| K5 | **`.gitignore` fayli umuman yo'q** | repo ildizi | `.env` (haqiqiy `MONGO_URI`, `JWT_SECRET`, `IMGBB_API_KEY`), `node_modules/`, `client/build/` hech narsa bilan ignore qilinmagan. `DEPLOY.md`/`RENDER_DEPLOY.md` esa aynan `git add .` qilishni o'rgatadi. Natijada birinchi "deploy" urinishidayoq **haqiqiy sirlar ochiq/xususiy GitHub repo tarixiga tushib qolishi** mumkin — keyin ularni tarixdan olib tashlash qiyin. | S — `.gitignore` qo'shish (`.env`, `node_modules/`, `client/build/`) |

---

## 3. MUHIM kamchiliklar — birinchi mijozgacha kerak bo'ladi

| # | Muammo | Fayl | Tavsif | Hajm |
|---|--------|------|--------|------|
| M1 | **Socket.io manzili hardcoded, ko'p-mijozli modelga mos emas** | `client/src/components/HodimDashboard.js:34`, `Ekran.js:45`, `BoshliqDashboard.js:50` | Har uch componentda `io('http://localhost:5000')` qattiq yozilgan. `RENDER_DEPLOY.md` ham buni "har safar deploy'dan keyin 3 faylni qo'lda o'zgartiring va qayta push qiling" deb o'rgatadi. Bu aynan siz mo'ljallagan biznes modelga (bir kodni ko'p do'konga sotish) **to'g'ridan-to'g'ri zid** — har bir yangi mijoz uchun kodni qo'lda tahrirlab, qayta build/deploy qilish kerak bo'ladi. Production domenda bu sozlanmasa, real-time (Ekran, buyurtma holati) **umuman ishlamaydi**. | S — `process.env.REACT_APP_API_URL` yoki `window.location.origin` orqali dinamik manzil |
| M2 | **Hujjat va kod mos kelmaydi (production static serving)** | `RENDER_DEPLOY.md:10` vs `server/app.js` | Hujjat "✅ Production static file serving qo'shildi" deb yozadi, lekin `server/app.js`da `express.static`/`client/build`ni serve qiladigan kod **umuman yo'q**. Bitta-service (backend+frontend birga) deploy usuli hujjatda va'da qilinganidek ishlamaydi. | S-M — yo `express.static` qo'shish, yoki hujjatni ikki-servis (statik sayt + API) modeliga moslab qayta yozish |
| M3 | **Login uchun alohida brute-force himoyasi yo'q** | `server/app.js:26-30`, `server/routes/auth.js` | Faqat umumiy `100 so'rov/daqiqa` IP-limiter bor, `/api/auth/login`ga xos cheklov yo'q. Ma'lum (K2) default parol bilan birga bu adminga tezkor hujum xavfini oshiradi. | S — login uchun qattiqroq alohida rate-limit (masalan 5-10/daqiqa) |
| M4 | **O'chirilgan xodimning tokeni hali kuchda qoladi** | `server/middleware/auth.js`, `server/routes/admin.js:85-105` | Token statik JWT (24 soat), server tomonda bekor qilish mexanizmi yo'q. Hodim o'chirilgandan keyin ham uning oldingi tokeni **24 soatgacha ishlashda davom etadi** — ishdan bo'shatilgan xodim tizimga kirishda davom etishi mumkin. | M — token versiyasi/`tokenVersion` maydoni yoki qisqaroq TTL + logout ro'yxati |
| M5 | **Bog'liqliklarda ko'p sonli ma'lum zaifliklar** | `package.json`, `client/package.json` | `npm audit`: backendda 18 ta (shu jumladan `bcrypt`→`node-pre-gyp`→`tar`, `mongoose` NoSQL-sanitizatsiya zaifligi, `multer@1.x` — rasman "impacted by a number of vulnerabilities, upgrade to 2.x" deb yozilgan), frontendda 57 ta (1 tasi **critical**, react-scripts toolchain'i orqali). | M — `multer`ni 2.x'ga, `mongoose`/`express`larni so'nggi patch versiyalarga ko'tarish va qayta test qilish |
| M6 | **Build production muhitida ishdan chiqishi mumkin** | `client/src/components/BoshliqDashboard.js:163` | `` `Hodim qo\'shildi!` `` qatorida keraksiz `\'` bor (ESLint: `no-useless-escape`). Lokal `npm run build` ogohlantirish bilan o'tadi, lekin `CI=true` o'rnatilgan muhitlarda (masalan Netlify, ba'zi CI pipeline'lar) bu ogohlantirish **xatoga aylanadi va build butunlay to'xtaydi**. | S — bitta belgi (`\'` → `'`) tuzatish |
| M7 | **Buyurtma ID'si to'qnashish xavfi** | `server/models/Order.js:4-8`, `server/routes/orders.js:17` | `id: Date.now().toString()` — bir millisekundda ikkita mijoz "Buyurtma berish" tugmasini bossa, `unique` indeks xatosi (`E11000`) yuzaga keladi va mijoz umumiy "Xato yuz berdi" xabarini ko'radi, sababini tushunmaydi. Kam ehtimol, lekin tuzatishi arzon. | S — `crypto.randomUUID()` yoki `randomstring` bilan almashtirish |
| M8 | **Majburiy env o'zgaruvchilar ishga tushishda tekshirilmaydi** | `server/app.js` | `MONGO_URI`/`JWT_SECRET` noto'g'ri yoki bo'sh bo'lsa, server baribir portni tinglay boshlaydi, lekin har bir DB so'rovi tushunarsiz "buffering timed out" xatosi bilan osilib qoladi — production sozlashda debug qilishni qiyinlashtiradi. | S — ishga tushishda muhim env'larni tekshirib, aniq xabar bilan to'xtash |

---

## 4. YAXSHILASH takliflari — keyinga qoldirsa bo'ladi

| # | Taklif | Fayl | Hajm |
|---|--------|------|------|
| Y1 | CORS `origin: '*'` — productionda faqat kerakli domen(lar)ga cheklash | `server/app.js:13-18, 21` | S |
| Y2 | Parol uzunligi/murakkabligi tekshiruvi yo'q (`add-user`, avto-generatsiya 8 belgi bilan chegaralangan) | `server/routes/admin.js:49-82` | S |
| Y3 | Rasm yuklashda fayl turi/hajmi cheklovi yo'q — faqat ImgBB javobiga tayanadi | `server/routes/menu.js:9-11`, `uploadImage.js` | S |
| Y4 | Helmet yoki shunga o'xshash xavfsizlik header'lari yo'q | `server/app.js` | S |
| Y5 | `.env.example` fayli repo'da yo'q (faqat README/DEPLOY matnida namuna) — yangi reseller uchun sozlashni tezlashtiradi | repo ildizi | S |
| Y6 | Buyurtmalar/menyuda pagination yo'q — hozircha kichik hajmda muammo emas, do'kon kattalashsa kerak bo'ladi | `server/routes/orders.js`, `menu.js` | M |
| Y7 | Socket.io xona (room)larga bo'linmagan — har bir do'kon/filial uchun alohida namespace bo'lsa, ko'p-filialli SaaS uchun kelajakda foydali | `server/app.js` | M |

**Alohida band (fix rejasiga kiritilmadi, foydalanuvchi so'rovi bo'yicha):**
Masalliqlar/ombor moduli (`Ingredient` modeli, `admin.js` ichidagi `ingredients` endpointlari, `orders.js:72-81`dagi retsept bo'yicha emas, nom bo'yicha moslashtirilgan kamayish logikasi) — chala va nozik ekani ma'lum. Bu **MVP'dan chiqarish mumkin** deb belgilanadi; birinchi versiya uchun tuzatish talab etilmaydi.

---

## 5. Qo'lda/kod-tahlili orqali oqim testlari

> Izoh: barcha baholar §0'da tasvirlangan cheklov asosida — kodning to'liq so'rov→marshrut→model→javob zanjiri tekshirildi; DB talab qiladigan qismlar jonli Mongo bilan uchma-uch ishga tushirilmadi.

### Mijoz: menyu ochish → buyurtma berish → QR olish — **QISMAN**
- Menyuni ochish (`GET /api/get-menu`) — marshrut ommaviy, frontend chaqiruvi (`MijozMenu.js:32`) mos keladi. Kod darajasida to'g'ri.
- Savatga qo'shish/miqdorni o'zgartirish — sof frontend (localStorage), ishlaydi.
- Buyurtma berish (`POST /api/create-order`) — funksional jihatdan ishlaydi (order yaratiladi, QR generatsiya qilinadi — `qrcode` kutubxonasi bilan to'g'ri chaqirilgan), **lekin K1 tufayli narx/summa ishonchsiz** — shuning uchun "to'liq ishlaydi" emas, "qisman" (funksiya bor, ammo xavfsiz emas).
- QR olish — `MijozQR.js` faqat localStorage'dan o'qiydi, kod to'g'ri.

### Hodim: login → QR/buyurtma tasdiqlash — **QISMAN**
- Login (`POST /api/auth/login`) — bcrypt.compare + JWT to'g'ri implementatsiya qilingan.
- QR skanerlash — frontendda `jsQR` bilan brauzer kamerasidan amalga oshiriladi (`HodimDashboard.js:83-105`); headless sandbox'da jonli sinab bo'lmadi, lekin kod mantiqan to'g'ri va standart naqshga mos.
- Buyurtmani tasdiqlash (`confirm-order`) — holat tekshiruvi bor (`pending`dan boshqasini rad etadi), ishlaydi; ingredient kamayishi esa ombor modulining o'ziga xos nozikligi (yuqorida alohida band qilingan).
- "Tayyor" deb belgilash (`complete-order`) — ishlaydi, lekin K4 tufayli holat tekshiruvisiz — noto'g'ri ishlatilsa (yoki xato/hujum orqali) to'lovsiz buyurtmani ham "tayyor" qilish mumkin.

### Boshliq: login → menyu qo'shish/o'chirish → statistika — **ISHLAYDI**
- Login'da qo'shimcha `role !== 'admin'` frontend tekshiruvi bor (`BoshliqLogin.js:30-34`), lekin bu faqat UX — asosiy himoya baribir backend `adminMiddleware`da, shu bilan to'g'ri ishlaydi.
- Menyuga bo'lim/mahsulot qo'shish, rasm yuklash (ImgBB), tahrirlash, o'chirish — barchasi `authMiddleware + adminMiddleware` bilan himoyalangan, so'rov/javob shakllari frontend bilan mos.
- Statistika (`/api/admin/stats`) — faqat `pending` bo'lmagan buyurtmalarni hisoblaydi, mantiqan to'g'ri.
- Xodimlar CRUD — parol avto-generatsiyasi, o'zini o'chira olmaslik tekshiruvi ishlaydi.

### Socket.io: buyurtma holati real-time yangilanishi — **ISHLAYDI (faqat lokal dev) / BUZUQ (production)**
- Server tomoni to'g'ri: har bir order/menu o'zgarishida `io.emit('order-update'/'menu-update', ...)` chaqiriladi (`orders.js:84,105,140`, `menu.js:48,95,127,167`).
- Lekin barcha klient componentlari `io('http://localhost:5000')` manziliga **qattiq bog'langan** (M1). Do'kon egasi buni har bir production domenida qo'lda tuzatmasa (va DEPLOY hujjatlari buni "har deploy'dan keyin qo'lda tahrirlang" deb talab qiladi), **real-time funksiya production'da umuman ishlamaydi** — bu asosiy reklama qilingan xususiyatlardan biri, shuning uchun bu ayni ko'p-mijozli sotuv modeli uchun eng katta amaliy to'siq hisoblanadi.

---

## 6. Xulosa

Loyiha yagona do'kon uchun ichki demo/MVP sifatida mantiqan izchil va tushunarli yozilgan (rollar, holat mashinasi, real-time signalizatsiya to'g'ri o'ylangan). Ammo **ko'p mijozga sotiladigan mahsulot** sifatida uchta jiddiy blokator bor:

1. Narxni mijoz nazorat qilishi mumkin (K1) — to'g'ridan-to'g'ri pul yo'qotish xavfi.
2. Default admin parol + `.gitignore` yo'qligi (K2, K5) — birinchi kundayoq butun tizim boshqaruvi yoki maxfiy kalitlar oshkor bo'lishi mumkin.
3. Har bir do'kon uchun ijtimoiy manzilni qo'lda kodga yozib qayta deploy qilish talabi (M1) — sotuv/scale modelini amalda imkonsiz qiladi, buni env-based konfiguratsiyaga o'tkazmasdan turib ko'p mijozga sotib bo'lmaydi.

Yuqoridagi 5 ta KRITIK va 8 ta MUHIM bandni tuzatish (umumiy hajm — S/M darajasida, bir necha kunlik ish) dan keyin loyiha birinchi haqiqiy mijozga taklif qilishga yaroqli holatga keladi. Ombor/masalliqlar moduli ataylab keyingi bosqichga qoldirilishi mumkin.
