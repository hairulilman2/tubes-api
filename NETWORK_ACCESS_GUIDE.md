# 🌐 Panduan Akses Network - Buka Project di Perangkat Lain

## ✅ **Konfigurasi Sudah Diupdate**

File yang sudah diubah:
- `.env` → HOST=0.0.0.0 (allow external access)
- `script.js` → API_BASE auto-detect IP
- `cors.ts` → Allow all origins

## 🚀 **Langkah-langkah Setup**

### **1. Cari IP Address Komputer Server**

**Windows:**
```cmd
ipconfig
```
Cari "IPv4 Address" di bagian WiFi/Ethernet, contoh: `192.168.1.100`

**Mac/Linux:**
```bash
ifconfig
```

### **2. Jalankan Server**
```bash
cd tubes_api_1
npm run dev
```

Server akan berjalan di: `http://0.0.0.0:3333`

### **3. Akses dari Perangkat Lain**

**Web Interface:**
```
http://IP_ADDRESS:3333/web
```

**API Endpoints:**
```
http://IP_ADDRESS:3333/api/users
http://IP_ADDRESS:3333/api/attendances
```

**Contoh dengan IP 192.168.1.100:**
```
http://192.168.1.100:3333/web
http://192.168.1.100:3333/api/users
```

## 📱 **Testing dari Perangkat Lain**

### **Smartphone/Tablet:**
1. Pastikan terhubung WiFi yang sama
2. Buka browser
3. Akses: `http://IP_SERVER:3333/web`

### **Laptop/PC Lain:**
1. Pastikan di network yang sama
2. Buka browser
3. Akses: `http://IP_SERVER:3333/web`

### **Postman dari Perangkat Lain:**
1. Ganti base URL di Postman collection
2. Dari: `http://localhost:3333`
3. Ke: `http://IP_SERVER:3333`

## 🔧 **Troubleshooting**

### **Tidak Bisa Akses:**

1. **Check Firewall Windows:**
   - Buka Windows Defender Firewall
   - Allow port 3333 atau disable firewall sementara

2. **Check Network:**
   - Pastikan semua device di WiFi yang sama
   - Ping IP server dari device lain

3. **Check Server:**
   - Pastikan server running di 0.0.0.0:3333
   - Check terminal output

### **CORS Error:**
- Sudah dikonfigurasi allow all origins
- Jika masih error, restart server

### **API Not Working:**
- Check network connection
- Verify IP address benar
- Test dengan browser dulu: `http://IP:3333/api`

## 📋 **Quick Test Commands**

**Test dari komputer server:**
```bash
# Test local
curl http://localhost:3333/api

# Test network
curl http://0.0.0.0:3333/api
```

**Test dari device lain:**
```bash
# Ganti IP_SERVER dengan IP sebenarnya
curl http://IP_SERVER:3333/api
```

## 🎯 **Contoh Skenario**

**Server di IP: 192.168.1.100**

**Akses Web:**
- `http://192.168.1.100:3333/web`

**API Testing:**
- `http://192.168.1.100:3333/api/users`
- `http://192.168.1.100:3333/api/attendances`

**Postman Collection:**
- Update base_url: `http://192.168.1.100:3333`

## 🔒 **Security Notes**

- Server terbuka untuk network lokal
- Untuk production, gunakan HTTPS
- Set proper firewall rules
- Gunakan authentication yang kuat

## 📞 **Support**

Jika masih bermasalah:
1. Check IP address dengan `ipconfig`
2. Test ping dari device lain
3. Restart server dan router
4. Disable antivirus/firewall sementara

---

**Happy Networking! 🎉**