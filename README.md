# Hot Dog Shahobchasi - Buyurtma Tizimi

To'liq ishlaydigan hot dog shahobchasi uchun veb-applikatsiya. Mijozlar buyurtma beradi, hodimlar tasdiqlaydi va tayyorlaydi, boshliq nazorat qiladi.

## Texnologiyalar

- **Frontend**: React.js, Socket.io-client, jsQR
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB (MongoDB Atlas)
- **Rasm yuklash**: ImgBB API
- **Autentifikatsiya**: JWT + bcrypt
- **QR kod**: qrcode (backend), jsQR (frontend)

## O'rnatish

### 1. Loyihani klonlash

```bash
cd d:/hotdog
```

### 2. Barcha paketlarni o'rnatish

```bash
# Backend paketlari
npm install

# Frontend paketlari
cd client
npm install
cd ..
```

### 3. Environment o'zgaruvchilarini sozlash

`.env` fayl yarating va quyidagilarni kiriting:

```env
# MongoDB Atlas Connection
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/hotdog?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=your_very_strong_secret_key_here

# ImgBB API Key
IMGBB_API_KEY=your_imgbb_api_key_here

# Server Port
PORT=5000
```

### 4. MongoDB Atlas sozlash

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) ga kiring (bepul tier)
2. Yangi cluster yarating
3. Database user yarating
4. Network Access da IP manzilni qo'shing (0.0.0.0/0 - barcha IP lar uchun)
5. Connection string ni `.env` fayliga qo'ying

### 5. ImgBB API sozlash

1. [ImgBB API](https://api.imgbb.com/) ga kiring
2. "Get API Key" tugmasini bosing
3. API key ni `.env` fayliga qo'ying

## Ishga tushirish

### Development rejimida

Terminal 1 - Backend:
```bash
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

Backend: http://localhost:5000
Frontend: http://localhost:3000

### Production build

```bash
cd client
npm run build
```

## Foydalanish

### Dastlabki Admin

- **Username**: boshliq
- **Parol**: admin123

### Sahifalar

- `/` - Mijoz: Ism kiritish
- `/menu` - Mijoz: Menu ko'rish va buyurtma qilish
- `/savat` - Mijoz: Savat
- `/qr` - Mijoz: QR kod ko'rsatish
- `/hodim` - Hodim: Kirish
- `/hodim/dashboard` - Hodim: Dashboard (QR skanerlash, buyurtmalarni tasdiqlash)
- `/ekran` - Ekran: Smart TV uchun (buyurtmalar ko'rsatish)
- `/boshliq` - Boshliq: Kirish
- `/boshliq/dashboard` - Boshliq: Dashboard (statistika, menu, hodimlar, masalliqlar)

## Xususiyatlar

### Mijoz

- Ism kiritish
- Menu ko'rish (bo'limlar va mahsulotlar)
- Savatga qo'shish
- Buyurtma berish
- QR kod olish

### Hodim

- Login qilish
- QR kod skanerlash (brauzer kamerasi)
- Buyurtmani ko'rish va tasdiqlash (pul olish)
- Buyurtmani tayyor deb belgilash
- Real-time buyurtmalar ro'yxati

### Ekran (Smart TV)

- Real-time buyurtmalar ko'rsatish
- Tayyorlanayotgan buyurtmalar (chap)
- Tayyor buyurtmalar (o'ng)
- 60 soniyadan keyin avto-o'chirish

### Boshliq

- Statistika (sotilgan mahsulotlar, kassadagi pul)
- Masalliqlar boshqaruvi (qoldiq monitoring)
- Menu boshqaruvi (bo'lim va mahsulot qo'shish/o'chirish)
- Hodimlar boshqaruvi (qo'shish/o'chirish)
- Real-time yangilanishlar

## Real-time Yangilanishlar

Socket.io orqali:
- `order-update` - Buyurtma holati o'zgarganda
- `menu-update` - Menu o'zgarganda

## Xavfsizlik

- JWT token autentifikatsiya
- Bcrypt parol hash
- Rate limiting (100 request/minut)
- Admin va hodim routelari himoyalangan
- Input validatsiya

## Deploy qilish

### Vercel (tavsiya etiladi)

1. GitHub repository yarating
2. Vercel ga kiring va repository ni ulang
3. Environment variables ni qo'shing
4. Deploy qiling

Backend va frontend bir joyda deploy bo'ladi.

## Muammolarni hal qilish

### MongoDB ulanmayapti
- Connection string to'g'riligini tekshiring
- IP whitelist ni tekshiring (0.0.0.0/0)
- Database user parolini tekshiring

### ImgBB rasm yuklanmayapti
- API key to'g'riligini tekshiring
- Rasm hajmi 32MB dan kichik ekanligini tekshiring
- Internet ulanishini tekshiring

### Socket.io ishlamayapti
- CORS sozlamalarini tekshiring
- Port 5000 ochiqligini tekshiring

### QR scanner ishlamayapti
- HTTPS da ishlayotganingizni tekshiring (yoki localhost)
- Brauzer kamera ruxsatini bering

## Litsenziya

MIT

## Muallif

Nusratov Alisher
