# 🔧 Panduan Setup Zoom API Integration

## 📋 Persyaratan

1. **Zoom Developer Account** - Daftar di [Zoom Marketplace](https://marketplace.zoom.us/)
2. **Zoom App** - Buat aplikasi Zoom dengan tipe "Server-to-Server OAuth"

## 🚀 Langkah Setup

### 1. Buat Zoom App
1. Login ke [Zoom Marketplace](https://marketplace.zoom.us/)
2. Klik "Develop" → "Build App"
3. Pilih "Server-to-Server OAuth"
4. Isi informasi aplikasi:
   - App Name: `UNTAD Attendance System`
   - Company Name: `Universitas Tadulako`
   - Developer Email: email Anda

### 2. Konfigurasi App
1. **App Credentials:**
   - Copy `Account ID`, `Client ID`, `Client Secret`
   
2. **Scopes (Permissions):**
   - `meeting:write:admin` - Membuat meeting
   - `meeting:read:admin` - Membaca info meeting
   - `user:read:admin` - Membaca info user
   - `webinar:write:admin` - Membuat webinar (opsional)

3. **Webhooks:**
   - Event Subscription: Enable
   - Webhook URL: `https://yourdomain.com/api/zoom/webhook`
   - Events:
     - `meeting.ended`
     - `meeting.participant_joined`
     - `meeting.participant_left`

### 3. Environment Variables
Tambahkan ke file `.env`:

```env
ZOOM_API_KEY=your_account_id_here
ZOOM_API_SECRET=your_client_secret_here
ZOOM_WEBHOOK_SECRET=your_webhook_secret_here
```

### 4. Install Dependencies
```bash
npm install axios jsonwebtoken
```

## 🎯 Fitur yang Tersedia

### Untuk Dosen:
1. **Buat Meeting Zoom**
   - Judul meeting custom
   - Pilih mata kuliah
   - Set durasi meeting
   - Auto-generate meeting ID & password

2. **Monitor Meeting**
   - Lihat peserta real-time
   - Meeting URL & password
   - Status meeting aktif

3. **Auto Attendance**
   - Absensi otomatis saat meeting berakhir
   - Data peserta tersimpan ke database
   - Laporan absensi per meeting

### Untuk Mahasiswa:
- **Join Meeting** via link yang dibagikan dosen
- **Auto Attendance** - Otomatis terabsen jika join meeting
- **Riwayat Absensi** - Lihat riwayat kehadiran via Zoom

## 📊 Database Schema

### Tabel: zoom_meetings
```sql
{
  _id: ObjectId,
  meetingId: String,
  title: String,
  matakuliah: String,
  dosenId: String,
  joinUrl: String,
  password: String,
  duration: Number,
  status: String, // 'active', 'ended'
  participants: Array,
  attendanceCount: Number,
  createdAt: Date,
  endedAt: Date
}
```

### Tabel: zoom_attendances
```sql
{
  _id: ObjectId,
  meetingId: String,
  userId: String,
  userName: String,
  userEmail: String,
  joinTime: Date,
  leaveTime: Date,
  duration: Number,
  matakuliah: String,
  createdAt: Date
}
```

## 🔄 Webhook Flow

1. **Meeting Started** → Log meeting start
2. **Participant Joined** → Record join time
3. **Participant Left** → Record leave time
4. **Meeting Ended** → Process auto attendance

## 🛡️ Security

- Webhook signature verification
- JWT token validation
- Rate limiting untuk API calls
- Encrypted meeting passwords

## 🧪 Testing

1. **Test Meeting Creation:**
   ```bash
   curl -X POST http://localhost:3333/api/zoom/create-meeting \
   -H "Content-Type: application/json" \
   -d '{"title":"Test Meeting","matakuliah":"Test","duration":60,"dosenId":"123"}'
   ```

2. **Test Webhook:**
   - Gunakan ngrok untuk expose localhost
   - Set webhook URL ke ngrok URL
   - Test dengan meeting dummy

## 📞 Support

Jika ada masalah:
1. Cek Zoom App status di Marketplace
2. Verify API credentials
3. Check webhook logs
4. Test API connection

---
**Note:** Pastikan aplikasi Zoom sudah di-publish dan di-approve oleh Zoom sebelum digunakan di production.