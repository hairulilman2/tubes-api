// Auto-detect API base URL with fallback
function getApiBase() {
    const hostname = window.location.hostname || 'localhost';
    const protocol = window.location.protocol || 'http:';
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
        return 'http://localhost:3333/api';
    }
    
    return `${protocol}//${hostname}:3333/api`;
}

const API_BASE = getApiBase();

// State aplikasi
let currentUser = null;
let map = null;
let dosenMap = null;
let userMarker = null;
let attendanceMarker = null;
let radiusCircle = null;
let dosenMarker = null;
let dosenRadiusCircle = null;
let userLocation = null;
let dosenLocation = null;
let currentMeetingId = null;
let currentMeetingTimer = null;
let meetingStartTime = null;
let cameraStream = null;
let capturedPhoto = null;
let sessionTimer = null;
let currentLat = null;
let currentLng = null;
let isProcessingAbsen = false;
let sessionCheckInterval = null;
let isSessionExpired = false;

// Konfigurasi lokasi absensi
const ATTENDANCE_LOCATION = {
    lat: -0.8415911,
    lng: 119.8927127,
    name: "Ruang Kelas A1 - UNTAD"
};

const ATTENDANCE_RADIUS = 5; // meter

// Fungsi utama aplikasi
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updateTime();
    setInterval(updateTime, 1000);
});

function initializeApp() {
    // Cek jika user sudah login
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
        setupUIForRole(currentUser.role);
    }
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Tombol peta
    const getLocationBtn = document.getElementById('get-location');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getUserLocation);
    }

    // Tombol absen
    const absenPetaBtn = document.getElementById('absen-peta-btn');
    if (absenPetaBtn) {
        absenPetaBtn.addEventListener('click', processAttendancePeta);
    }

    // Input mahasiswa
    const mahasiswaName = document.getElementById('mahasiswaName');
    const mahasiswaNIM = document.getElementById('mahasiswaNIM');
    const mahasiswaKelas = document.getElementById('mahasiswaKelas');
    const mahasiswaMatkul = document.getElementById('mahasiswaMatkul');
    
    if (mahasiswaName) mahasiswaName.addEventListener('input', checkAttendanceEligibility);
    if (mahasiswaNIM) mahasiswaNIM.addEventListener('input', checkAttendanceEligibility);
    if (mahasiswaKelas) mahasiswaKelas.addEventListener('change', findDosenByClassAndSubject);
    if (mahasiswaMatkul) mahasiswaMatkul.addEventListener('change', findDosenByClassAndSubject);

    // Kamera
    const takePhotoBtn = document.getElementById('take-photo-btn');
    const retakeBtn = document.getElementById('retake-photo-btn');
    const confirmBtn = document.getElementById('confirm-attendance-btn');
    
    if (takePhotoBtn) takePhotoBtn.addEventListener('click', takePhoto);
    if (retakeBtn) retakeBtn.addEventListener('click', retakePhoto);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmAttendance);

    // Admin forms
    const adminRegisterForm = document.getElementById('adminRegisterForm');
    if (adminRegisterForm) {
        adminRegisterForm.addEventListener('submit', handleAdminRegister);
    }

    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUser);
    }

    // Edit attendance form
    const editAttendanceForm = document.getElementById('editAttendanceForm');
    if (editAttendanceForm) {
        editAttendanceForm.addEventListener('submit', handleEditAttendance);
    }

    // Tab absenPeta
    const absenPetaTab = document.getElementById('absenPetaTab');
    if (absenPetaTab) {
        absenPetaTab.addEventListener('click', function() {
            setTimeout(() => {
                initMap();
            }, 300);
        });
    }

    // Close modal ketika klik di luar
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeEditModal();
            }
        });
    }
    
    // Close modal dengan Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            closeEditModal();
        }
    });

    // Initialize admin form
    if (document.getElementById('adminRegRole')) {
        toggleAdminLocationFields();
    }
}

// Login Functions
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const selectedRole = document.getElementById('role').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok) {
            // Check if user is admin (auto-detect)
            if (result.user.role === 'admin') {
                console.log('Admin login detected');
            } else {
                // Verify role matches for non-admin users
                if (result.user.role !== selectedRole) {
                    showResult('loginResult', `Role tidak sesuai! Anda login sebagai ${selectedRole} tapi akun Anda adalah ${result.user.role}. Silakan pilih role yang benar.`, 'error');
                    return;
                }
            }
            console.log('Login successful for role:', result.user.role);

            currentUser = result.user;
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));

            // Show main app and hide login
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            document.body.classList.remove('login-mode');

            // Setup UI based on actual user role
            setupUIForRole(result.user.role);

            console.log('Setting up UI for role:', result.user.role);

            showResult('loginResult', 'Login berhasil!', 'success');
        } else {
            let errorMessage = result.message;
            if (result.message === 'Invalid credentials') {
                errorMessage = 'Username atau password salah! Pastikan Anda memasukkan NIM/NIP dan password yang benar.';
            }
            showResult('loginResult', errorMessage, 'error');
        }
    } catch (error) {
        showResult('loginResult', 'Error: ' + error.message, 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;

    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
    document.body.classList.add('login-mode');

    // Reset forms
    document.getElementById('loginForm').reset();
    showResult('loginResult', 'Logout berhasil!', 'success');
}

// UI Functions
function showMainApp() {
    document.body.classList.remove('login-mode');
    document.body.classList.add('app-mode');
}

function setupUIForRole(role) {
    const absenPetaTab = document.getElementById('absenPetaTab');
    const zoomMahasiswaTab = document.getElementById('zoomMahasiswaTab');
    const adminTab = document.getElementById('adminTab');
    const dosenTab = document.getElementById('dosenTab');
    const zoomTab = document.getElementById('zoomTab');

    // Hide all tabs first
    absenPetaTab.style.display = 'none';
    zoomMahasiswaTab.style.display = 'none';
    adminTab.style.display = 'none';
    dosenTab.style.display = 'none';
    zoomTab.style.display = 'none';

    switch (role) {
        case 'mahasiswa':
            absenPetaTab.style.display = 'block';
            zoomMahasiswaTab.style.display = 'block';
            showTab('absenPeta');
            break;

        case 'dosen':
            dosenTab.style.display = 'block';
            zoomTab.style.display = 'block';
            showTab('dosen');
            setupDosenInfo();
            loadAllAttendanceData();
            break;

        case 'admin':
            console.log('Setting up admin UI');
            adminTab.style.display = 'block';
            showTab('admin');
            loadStats();
            loadAllUsersAdmin();
            break;
    }
}

function showTab(tabName) {
    // Sembunyikan semua tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Nonaktifkan semua tab buttons
    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Aktifkan tab yang dipilih
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        
        // Aktifkan tombol tab yang sesuai
        const tabButton = Array.from(tabButtons).find(btn => 
            btn.getAttribute('onclick')?.includes(tabName)
        );
        if (tabButton) {
            tabButton.classList.add('active');
        }
    }
    
    // Inisialisasi peta jika diperlukan
    if (tabName === 'absenPeta') {
        setTimeout(() => {
            initMap();
            setTimeout(() => {
                getUserLocation();
                startSessionMonitoring();
            }, 500);
        }, 300);
    }
    
    if (tabName === 'dosen') {
        setTimeout(() => {
            initDosenMap();
            loadDosenAttendances();
        }, 300);
    }
    
    if (tabName === 'zoom') {
        setTimeout(() => {
            setupZoomInfo();
            loadAllAttendanceData();
        }, 300);
    }
    
    if (tabName === 'zoomMahasiswa') {
        setTimeout(() => {
            setupMahasiswaZoomInfo();
            loadMahasiswaMeetingHistory();
        }, 300);
    }
}

function showAdminTab(tabName) {
    const adminTabContents = document.querySelectorAll('.admin-tab-content');
    adminTabContents.forEach(tab => tab.classList.remove('active'));
    
    const adminTabButtons = document.querySelectorAll('.admin-tab');
    adminTabButtons.forEach(btn => btn.classList.remove('active'));
    
    const selectedTab = document.getElementById('admin' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    const tabButton = Array.from(adminTabButtons).find(btn => 
        btn.getAttribute('onclick')?.includes(tabName)
    );
    if (tabButton) {
        tabButton.classList.add('active');
    }
}

function showResult(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `result ${type}`;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Map Functions
function initMap() {
    const mapElement = document.getElementById('map');
    
    if (mapElement) {
        try {
            if (map) {
                map.remove();
            }
            
            map = L.map('map', {
                center: [ATTENDANCE_LOCATION.lat, ATTENDANCE_LOCATION.lng],
                zoom: 16,
                zoomControl: true
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);
            
            attendanceMarker = L.marker([ATTENDANCE_LOCATION.lat, ATTENDANCE_LOCATION.lng], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);

            attendanceMarker.bindPopup(`
                <b>${ATTENDANCE_LOCATION.name}</b><br>
                Lokasi Absensi<br>
                Radius: ${ATTENDANCE_RADIUS}m
            `);

            radiusCircle = L.circle([ATTENDANCE_LOCATION.lat, ATTENDANCE_LOCATION.lng], {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.2,
                radius: ATTENDANCE_RADIUS
            }).addTo(map);
            
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
            
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }
}

function getUserLocation() {
    const locationInfo = document.getElementById('location-info');
    const getLocationBtn = document.getElementById('get-location');
    
    if (!getLocationBtn) return;
    
    getLocationBtn.disabled = true;
    getLocationBtn.textContent = '📍 Mencari lokasi...';
    locationInfo.innerHTML = '<p>🔍 Mencari lokasi Anda...</p>';

    if (!navigator.geolocation) {
        locationInfo.innerHTML = '<p style="color: red;">❌ Geolocation tidak didukung browser ini</p>';
        getLocationBtn.disabled = false;
        getLocationBtn.textContent = '📍 Dapatkan Lokasi Saya';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            locationInfo.innerHTML = `
                <p><strong>Latitude:</strong> ${userLocation.lat.toFixed(6)}</p>
                <p><strong>Longitude:</strong> ${userLocation.lng.toFixed(6)}</p>
                <p><strong>Akurasi:</strong> ±${position.coords.accuracy.toFixed(0)}m</p>
            `;

            if (userMarker) {
                map.removeLayer(userMarker);
            }

            userMarker = L.marker([userLocation.lat, userLocation.lng], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);

            userMarker.bindPopup('📍 Lokasi Anda');
            checkAttendanceEligibility();

            getLocationBtn.disabled = false;
            getLocationBtn.textContent = '🔄 Perbarui Lokasi';

            const group = new L.featureGroup([userMarker, attendanceMarker]);
            map.fitBounds(group.getBounds().pad(0.1));
        },
        (error) => {
            let errorMsg = '';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = '❌ Akses lokasi ditolak. Silakan izinkan akses lokasi.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = '❌ Informasi lokasi tidak tersedia.';
                    break;
                case error.TIMEOUT:
                    errorMsg = '❌ Timeout mencari lokasi.';
                    break;
                default:
                    errorMsg = '❌ Error tidak dikenal.';
                    break;
            }
            
            locationInfo.innerHTML = `<p style="color: red;">${errorMsg}</p>`;
            getLocationBtn.disabled = false;
            getLocationBtn.textContent = '📍 Coba Lagi';
        }
    );
}

function calculateDistancePeta(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

async function checkAttendanceEligibility() {
    if (!userLocation) return;

    const distance = calculateDistancePeta(
        userLocation.lat, userLocation.lng,
        ATTENDANCE_LOCATION.lat, ATTENDANCE_LOCATION.lng
    );

    const statusDiv = document.getElementById('attendance-status');
    const distanceInfo = document.getElementById('distance-info');
    const absenBtn = document.getElementById('absen-peta-btn');

    if (!statusDiv || !distanceInfo || !absenBtn) return;

    distanceInfo.innerHTML = `📏 Jarak dari lokasi absensi: <strong>${distance.toFixed(1)} meter</strong>`;

    const mahasiswaName = document.getElementById('mahasiswaName').value.trim();
    const mahasiswaNIM = document.getElementById('mahasiswaNIM').value.trim();
    const mahasiswaKelas = document.getElementById('mahasiswaKelas').value;
    const mahasiswaMatkul = document.getElementById('mahasiswaMatkul').value;
    const isDataComplete = mahasiswaName && mahasiswaNIM && mahasiswaKelas && mahasiswaMatkul;

    // Check if already attended this subject today
    if (mahasiswaNIM && mahasiswaMatkul) {
        const existingAttendances = JSON.parse(localStorage.getItem('attendances') || '[]');
        const today = new Date().toDateString();
        const alreadyAttended = existingAttendances.find(att => {
            const attDate = new Date(att.createdAt).toDateString();
            return att.nim === mahasiswaNIM && att.matakuliah === mahasiswaMatkul && attDate === today;
        });
        
        if (alreadyAttended) {
            statusDiv.textContent = '✅ Sudah absen untuk mata kuliah ini hari ini';
            statusDiv.style.background = '#d4edda';
            statusDiv.style.color = '#155724';
            statusDiv.style.border = '1px solid #c3e6cb';
            absenBtn.disabled = true;
            absenBtn.textContent = '✅ Sudah Absen';
            absenBtn.style.background = '#6c757d';
            
            // Add cancel button if not exists
            if (!document.querySelector('.btn-danger')) {
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = '❌ Batal Absen';
                cancelBtn.className = 'btn btn-danger';
                cancelBtn.onclick = () => cancelAttendance(alreadyAttended.id);
                absenBtn.parentNode.appendChild(cancelBtn);
            }
            return;
        }
    }

    // ✅ CEK SESSION AKTIF SEBELUM ENABLE TOMBOL ABSEN
    let isSessionActive = false;
    if (isDataComplete) {
        try {
            const dosenList = await fetch(`${API_BASE}/users/dosen`);
            const dosenData = await dosenList.json();
            const dosen = dosenData.find(d => d.latitude && d.longitude);
            
            if (dosen) {
                const sessionResponse = await fetch(`${API_BASE}/attendances/session/${dosen.id}`);
                const sessionData = await sessionResponse.json();
                isSessionActive = sessionData.isActive;
                
                if (!isSessionActive) {
                    statusDiv.innerHTML = '❌ <strong>SESSION BELUM DIMULAI</strong><br><small>Dosen belum menyalakan session absensi</small>';
                    statusDiv.style.background = '#f8d7da';
                    statusDiv.style.color = '#721c24';
                    statusDiv.style.border = '1px solid #f5c6cb';
                    absenBtn.disabled = true;
                    absenBtn.textContent = '❌ Session Belum Aktif';
                    return;
                }
            }
        } catch (error) {
            console.error('Error checking session:', error);
        }
    }

    if (distance <= ATTENDANCE_RADIUS && isDataComplete && isSessionActive) {
        statusDiv.textContent = '✅ Siap untuk absen';
        statusDiv.style.background = '#d4edda';
        statusDiv.style.color = '#155724';
        statusDiv.style.border = '1px solid #c3e6cb';
        absenBtn.disabled = false;
        absenBtn.textContent = '✅ ABSEN SEKARANG';
    } else if (distance <= ATTENDANCE_RADIUS && !isDataComplete) {
        statusDiv.textContent = '⚠️ Lengkapi data mahasiswa';
        statusDiv.style.background = '#fff3cd';
        statusDiv.style.color = '#856404';
        statusDiv.style.border = '1px solid #ffeaa7';
        absenBtn.disabled = true;
        absenBtn.textContent = '⚠️ Lengkapi Data';
    } else {
        statusDiv.textContent = '❌ Di luar radius absensi';
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.style.border = '1px solid #f5c6cb';
        absenBtn.disabled = true;
        absenBtn.textContent = `❌ Terlalu jauh (${(distance - ATTENDANCE_RADIUS).toFixed(1)}m)`;
    }
}

// Attendance Functions
async function processAttendancePeta() {
    const mahasiswaName = document.getElementById('mahasiswaName').value.trim();
    const mahasiswaNIM = document.getElementById('mahasiswaNIM').value.trim();
    const mahasiswaKelas = document.getElementById('mahasiswaKelas').value;
    const mahasiswaMatkul = document.getElementById('mahasiswaMatkul').value;
    
    if (!mahasiswaName) {
        alert('❌ Masukkan nama mahasiswa!');
        document.getElementById('mahasiswaName').focus();
        return;
    }
    
    if (!mahasiswaNIM) {
        alert('❌ Masukkan NIM mahasiswa!');
        document.getElementById('mahasiswaNIM').focus();
        return;
    }
    
    if (!mahasiswaKelas) {
        alert('❌ Pilih kelas!');
        document.getElementById('mahasiswaKelas').focus();
        return;
    }
    
    if (!mahasiswaMatkul) {
        alert('❌ Pilih mata kuliah!');
        document.getElementById('mahasiswaMatkul').focus();
        return;
    }
    
    if (!userLocation) {
        alert('❌ Lokasi belum didapatkan!');
        return;
    }

    // ✅ CEK SESSION AKTIF DULU SEBELUM ABSEN
    if (isSessionExpired) {
        alert('❌ SESSION ABSENSI SUDAH BERAKHIR!\n\nWaktu absensi telah habis.');
        return;
    }
    
    try {
        const dosenList = await fetch(`${API_BASE}/users/dosen`);
        const dosenData = await dosenList.json();
        const dosen = dosenData.find(d => d.latitude && d.longitude);
        
        if (!dosen) {
            alert('❌ Tidak ada dosen yang tersedia untuk mata kuliah ini!');
            return;
        }
        
        const sessionResponse = await fetch(`${API_BASE}/attendances/session/${dosen.id}`);
        const sessionData = await sessionResponse.json();
        
        if (!sessionData.isActive) {
            isSessionExpired = true;
            alert('❌ SESSION ABSENSI SUDAH BERAKHIR!\n\nWaktu absensi telah habis atau belum dimulai.');
            disableAttendanceForExpiredSession();
            return;
        }
        
        const timeRemaining = Math.floor(sessionData.timeRemaining / 60);
        console.log(`✅ Session aktif, sisa waktu: ${timeRemaining} menit`);
        
    } catch (error) {
        alert('❌ Gagal mengecek status session absensi!\n\nError: ' + error.message);
        return;
    }

    const distance = calculateDistancePeta(
        userLocation.lat, userLocation.lng,
        ATTENDANCE_LOCATION.lat, ATTENDANCE_LOCATION.lng
    );

    if (distance > ATTENDANCE_RADIUS) {
        alert('❌ Anda berada di luar radius absensi!');
        return;
    }

    const cameraSection = document.getElementById('camera-section');
    cameraSection.style.display = 'block';
    
    const absenBtn = document.getElementById('absen-peta-btn');
    absenBtn.disabled = true;
    absenBtn.textContent = '📷 Ambil Foto Dulu';
    
    startCamera();
}

// Camera Functions
async function startCamera() {
    try {
        const video = document.getElementById('camera-video');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
        });
        
        cameraStream = stream;
        video.srcObject = stream;
        video.style.display = 'block';
        
        document.getElementById('take-photo-btn').disabled = false;
        showResult('joinMeetingResult', 'Kamera berhasil diaktifkan!', 'success');
    } catch (error) {
        showResult('joinMeetingResult', 'Gagal mengakses kamera: ' + error.message, 'error');
    }
}

function takePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const preview = document.getElementById('photo-preview');
    const takePhotoBtn = document.getElementById('take-photo-btn');
    const retakeBtn = document.getElementById('retake-photo-btn');
    const confirmBtn = document.getElementById('confirm-attendance-btn');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    capturedPhoto = canvas.toDataURL('image/jpeg', 0.8);
    
    preview.innerHTML = `<img src="${capturedPhoto}" style="width: 100%; border-radius: 8px;" alt="Foto Absensi">`;
    
    video.style.display = 'none';
    takePhotoBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-block';
    confirmBtn.style.display = 'inline-block';
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    
    showResult('joinMeetingResult', 'Foto berhasil diambil!', 'success');
}

function retakePhoto() {
    const preview = document.getElementById('photo-preview');
    const takePhotoBtn = document.getElementById('take-photo-btn');
    const retakeBtn = document.getElementById('retake-photo-btn');
    const confirmBtn = document.getElementById('confirm-attendance-btn');
    
    preview.innerHTML = '';
    capturedPhoto = null;
    
    takePhotoBtn.style.display = 'inline-block';
    retakeBtn.style.display = 'none';
    confirmBtn.style.display = 'none';
    
    startCamera();
}

function confirmAttendance() {
    const mahasiswaName = document.getElementById('mahasiswaName').value.trim();
    const mahasiswaNIM = document.getElementById('mahasiswaNIM').value.trim();
    const mahasiswaKelas = document.getElementById('mahasiswaKelas').value;
    const mahasiswaMatkul = document.getElementById('mahasiswaMatkul').value;
    
    // Check if already attended this subject today
    const existingAttendances = JSON.parse(localStorage.getItem('attendances') || '[]');
    const today = new Date().toDateString();
    const alreadyAttended = existingAttendances.find(att => {
        const attDate = new Date(att.createdAt).toDateString();
        return att.nim === mahasiswaNIM && att.matakuliah === mahasiswaMatkul && attDate === today;
    });
    
    if (alreadyAttended) {
        alert(`❌ Anda sudah absen untuk mata kuliah ${mahasiswaMatkul} hari ini!\n\nWaktu absen: ${new Date(alreadyAttended.createdAt).toLocaleString('id-ID')}`);
        return;
    }
    
    const distance = calculateDistancePeta(
        userLocation.lat, userLocation.lng,
        ATTENDANCE_LOCATION.lat, ATTENDANCE_LOCATION.lng
    );
    
    const attendanceData = {
        id: Date.now().toString(),
        name: mahasiswaName,
        nim: mahasiswaNIM,
        kelas: mahasiswaKelas,
        matakuliah: mahasiswaMatkul,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        distance: distance.toFixed(1),
        status: distance <= ATTENDANCE_RADIUS ? 'hadir' : 'terlambat',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        photo: capturedPhoto
    };
    
    let attendances = JSON.parse(localStorage.getItem('attendances') || '[]');
    attendances.push(attendanceData);
    localStorage.setItem('attendances', JSON.stringify(attendances));
    
    alert(`✅ Absensi berhasil!\n\nNama: ${mahasiswaName}\nNIM: ${mahasiswaNIM}\nKelas: ${mahasiswaKelas}\nMata Kuliah: ${mahasiswaMatkul}\nWaktu: ${new Date().toLocaleString('id-ID')}\nJarak: ${distance.toFixed(1)} meter`);
    
    const absenBtn = document.getElementById('absen-peta-btn');
    absenBtn.textContent = '✅ Sudah Absen';
    absenBtn.style.background = '#6c757d';
    
    // Add cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '❌ Batal Absen';
    cancelBtn.className = 'btn btn-danger';
    cancelBtn.onclick = () => cancelAttendance(attendanceData.id);
    absenBtn.parentNode.appendChild(cancelBtn);
    
    // Add button to attend another subject
    const newSubjectBtn = document.createElement('button');
    newSubjectBtn.textContent = '📚 Absen Mata Kuliah Lain';
    newSubjectBtn.className = 'btn btn-info';
    newSubjectBtn.onclick = () => resetForNewSubject();
    absenBtn.parentNode.appendChild(newSubjectBtn);
    
    document.getElementById('mahasiswaKelas').disabled = true;
    document.getElementById('mahasiswaMatkul').disabled = true;
    
    document.getElementById('camera-section').style.display = 'none';
}

// Dosen Map Functions
function initDosenMap() {
    const mapElement = document.getElementById('dosenMap');
    
    if (mapElement) {
        try {
            if (dosenMap) {
                dosenMap.remove();
            }
            
            const lat = parseFloat(document.getElementById('dosenLat').value) || ATTENDANCE_LOCATION.lat;
            const lng = parseFloat(document.getElementById('dosenLng').value) || ATTENDANCE_LOCATION.lng;
            
            dosenLocation = { lat, lng };
            
            dosenMap = L.map('dosenMap', {
                center: [lat, lng],
                zoom: 16,
                zoomControl: true
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(dosenMap);
            
            dosenMarker = L.marker([lat, lng], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(dosenMap);

            dosenMarker.bindPopup(`
                <b>Lokasi Kelas Dosen</b><br>
                Radius Absensi: ${ATTENDANCE_RADIUS}m
            `);

            dosenRadiusCircle = L.circle([lat, lng], {
                color: 'green',
                fillColor: '#0f3',
                fillOpacity: 0.2,
                radius: ATTENDANCE_RADIUS
            }).addTo(dosenMap);
            
            setTimeout(() => {
                dosenMap.invalidateSize();
            }, 100);
            
        } catch (error) {
            console.error('Error initializing dosen map:', error);
        }
    }
}

function centerDosenMap() {
    const lat = parseFloat(document.getElementById('dosenLat').value);
    const lng = parseFloat(document.getElementById('dosenLng').value);
    
    if (dosenMap && lat && lng) {
        dosenMap.setView([lat, lng], 16);
        
        if (dosenMarker) {
            dosenMarker.setLatLng([lat, lng]);
        }
        if (dosenRadiusCircle) {
            dosenRadiusCircle.setLatLng([lat, lng]);
        }
    }
}

// Utility Functions
function updateTime() {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleString('id-ID');
    }
}

// Admin Functions
async function handleAdminRegister(event) {
    event.preventDefault();

    if (currentUser.role !== 'admin') {
        showResult(
            'adminRegisterResult',
            'Akses ditolak! Hanya admin yang bisa mendaftarkan user.',
            'error'
        );
        return;
    }

    const role = document.getElementById('adminRegRole').value;
    const nimNipValue = document.getElementById('adminRegEmail').value;

    const data = {
        name: document.getElementById('adminRegName').value,
        email: nimNipValue, // Use as username
        password: document.getElementById('adminRegPassword').value,
        role: role,
        kelas: document.getElementById('adminRegKelas').value || null,
    };

    // Add NIM or NIP based on role
    if (role === 'mahasiswa') {
        data.nim = nimNipValue;
    } else if (role === 'dosen') {
        data.nip = nimNipValue;
        // Lokasi akan diset oleh dosen sendiri setelah login
    }

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            showResult(
                'adminRegisterResult',
                `User ${data.role} berhasil didaftarkan! ID: ${result.user.id}`,
                'success'
            );
            document.getElementById('adminRegisterForm').reset();
            loadStats();
            loadAllUsersAdmin();
        } else {
            showResult('adminRegisterResult', result.message, 'error');
        }
    } catch (error) {
        showResult('adminRegisterResult', 'Error: ' + error.message, 'error');
    }
}

function toggleAdminLocationFields() {
    const role = document.getElementById('adminRegRole').value;
    const locationFields = document.getElementById('adminLocationFields');
    const emailLabel = document.getElementById('adminRegEmailLabel');
    const emailInput = document.getElementById('adminRegEmail');

    if (role === 'dosen') {
        locationFields.style.display = 'block';
        emailLabel.textContent = 'NIP:';
        emailInput.placeholder = 'Masukkan NIP';
    } else {
        locationFields.style.display = 'none';
        emailLabel.textContent = 'NIM:';
        emailInput.placeholder = 'Masukkan NIM';
    }
}

async function loadStats() {
    if (currentUser.role !== 'admin') return;

    try {
        const response = await fetch(`${API_BASE}/users`);
        const users = await response.json();

        const totalUsers = users.length;
        const totalDosen = users.filter((u) => u.role === 'dosen').length;
        const totalMahasiswa = users.filter((u) => u.role === 'mahasiswa').length;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalDosen').textContent = totalDosen;
        document.getElementById('totalMahasiswa').textContent = totalMahasiswa;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Setup dosen info
function setupDosenInfo() {
    if (currentUser && currentUser.role === 'dosen') {
        document.getElementById('dosenName').textContent = currentUser.name || 'Tidak tersedia';
        document.getElementById('dosenNIP').textContent = currentUser.email || 'Tidak tersedia';
        
        // Event listener untuk mata kuliah dosen
        const dosenMatkul = document.getElementById('dosenMatkul');
        if (dosenMatkul) {
            dosenMatkul.addEventListener('change', function() {
                console.log('Mata kuliah dosen dipilih:', this.value);
            });
        }
    }
}

// Dosen Location Functions
function getAndSaveDosenLocation() {
    if (!currentUser || currentUser.role !== 'dosen') {
        alert('Hanya dosen yang bisa set koordinat');
        return;
    }

    if (navigator.geolocation) {
        showResult('locationResult', 'Mengambil lokasi...', 'info');
        
        navigator.geolocation.getCurrentPosition(async function (position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            
            document.getElementById('dosenLat').value = latitude;
            document.getElementById('dosenLng').value = longitude;
            
            try {
                const response = await fetch(`${API_BASE}/users/${currentUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ latitude, longitude }),
                });

                const result = await response.json();

                if (response.ok) {
                    showResult('locationResult', 'Lokasi berhasil diambil dan disimpan!', 'success');
                    updateShareLocation(latitude, longitude);
                    
                    if (dosenMap) {
                        dosenMap.setView([latitude, longitude], 16);
                        if (dosenMarker) {
                            dosenMarker.setLatLng([latitude, longitude]);
                        }
                        if (dosenRadiusCircle) {
                            dosenRadiusCircle.setLatLng([latitude, longitude]);
                        }
                    }
                } else {
                    showResult('locationResult', 'Error menyimpan lokasi', 'error');
                }
            } catch (error) {
                showResult('locationResult', 'Error: ' + error.message, 'error');
            }
        }, function(error) {
            showResult('locationResult', 'Gagal mengambil lokasi', 'error');
        });
    } else {
        showResult('locationResult', 'Geolocation tidak didukung browser', 'error');
    }
}

function shareCurrentLocation() {
    if (!currentUser || currentUser.role !== 'dosen') {
        alert('Hanya dosen yang bisa share lokasi');
        return;
    }

    const lat = document.getElementById('dosenLat').value;
    const lng = document.getElementById('dosenLng').value;

    if (!lat || !lng) {
        alert('Set koordinat terlebih dahulu!');
        return;
    }

    const shareText = `Lokasi Absensi:\nDosen: ${currentUser.name}\nLatitude: ${lat}\nLongitude: ${lng}\nGoogle Maps: https://maps.google.com/?q=${lat},${lng}`;

    if (navigator.share) {
        navigator.share({
            title: 'Lokasi Absensi',
            text: shareText,
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Informasi lokasi berhasil disalin ke clipboard!');
        });
    }
}

function updateShareLocation(lat, lng) {
    const shareDiv = document.getElementById('shareLocation');
    if (shareDiv) {
        shareDiv.innerHTML = `
            <div class="share-info">
                <h5>📍 Koordinat Absensi Aktif:</h5>
                <p><strong>Latitude:</strong> ${lat}</p>
                <p><strong>Longitude:</strong> ${lng}</p>
                <button class="btn btn-info btn-sm" onclick="copyCoordinates(${lat}, ${lng})">📋 Copy Koordinat</button>
                <button class="btn btn-warning btn-sm" onclick="shareLocationLink(${lat}, ${lng})">🔗 Share Link</button>
            </div>
        `;
    }
}

function copyCoordinates(lat, lng) {
    const text = `Latitude: ${lat}, Longitude: ${lng}`;
    navigator.clipboard.writeText(text).then(() => {
        alert('Koordinat berhasil disalin!');
    }).catch(() => {
        // Fallback untuk browser yang tidak support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Koordinat berhasil disalin!');
    });
}

function shareLocationLink(lat, lng) {
    const googleMapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    navigator.clipboard.writeText(googleMapsLink).then(() => {
        alert('Link Google Maps berhasil disalin!');
    }).catch(() => {
        // Fallback untuk browser yang tidak support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = googleMapsLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Link Google Maps berhasil disalin!');
    });
}

// Load attendances for dosen
async function loadDosenAttendances() {
    if (!currentUser || currentUser.role !== 'dosen') return;

    const attendancesList = document.getElementById('dosenAttendancesList');
    attendancesList.innerHTML = `<h5>📋 Absensi untuk ${currentUser.name}:</h5>`;

    // Load from localStorage first
    const localAttendances = JSON.parse(localStorage.getItem('attendances') || '[]');
    
    if (localAttendances.length === 0) {
        attendancesList.innerHTML += '<p>Belum ada data absensi.</p>';
        return;
    }

    // Group by mata kuliah
    const groupedByMatkul = {};
    localAttendances.forEach(att => {
        const matkul = att.matakuliah || 'Tidak Diketahui';
        if (!groupedByMatkul[matkul]) {
            groupedByMatkul[matkul] = [];
        }
        groupedByMatkul[matkul].push(att);
    });

    // Display each mata kuliah with classes
    Object.keys(groupedByMatkul).forEach(matkul => {
        const attendances = groupedByMatkul[matkul];
        const sectionId = `matkul-${matkul.replace(/\s+/g, '-').toLowerCase()}`;
        
        // Group by class within mata kuliah
        const groupedByKelas = {};
        attendances.forEach(att => {
            const kelas = att.kelas || 'Tidak Diketahui';
            if (!groupedByKelas[kelas]) {
                groupedByKelas[kelas] = [];
            }
            groupedByKelas[kelas].push(att);
        });
        
        let kelasContent = '';
        Object.keys(groupedByKelas).forEach(kelas => {
            const kelasAttendances = groupedByKelas[kelas];
            const kelasId = `${sectionId}-${kelas.replace(/\s+/g, '-').toLowerCase()}`;
            
            kelasContent += `
                <div class="kelas-subsection">
                    <div class="kelas-header" onclick="toggleMatkulSection('${kelasId}')">
                        <span>Kelas ${kelas} (${kelasAttendances.length} mahasiswa)</span>
                        <span id="${kelasId}-icon">▼</span>
                    </div>
                    <div class="matkul-content" id="${kelasId}">
                        ${generateAttendanceItems(kelasAttendances)}
                    </div>
                </div>
            `;
        });
        
        attendancesList.innerHTML += `
            <div class="matkul-section">
                <div class="matkul-header" style="background: #2c5e2e; color: white; cursor: default;">
                    <span>📚 ${matkul}</span>
                </div>
                <div class="matkul-content" style="display: block; padding: 0;">
                    ${kelasContent}
                </div>
            </div>
        `;
    });
}

function generateAttendanceItems(attendances) {
    return attendances.map(att => {
        let statusClass = 'status-tidak-hadir';
        let statusIcon = '❌';
        if (att.status === 'hadir') {
            statusClass = 'status-hadir';
            statusIcon = '✅';
        } else if (att.status === 'terlambat') {
            statusClass = 'status-terlambat';
            statusIcon = '⚠️';
        }

        const waktu = att.createdAt ? new Date(att.createdAt).toLocaleString('id-ID') : 
                     att.timestamp ? new Date(att.timestamp).toLocaleString('id-ID') : 'Tidak tersedia';

        const photoHtml = att.photo ? `<img src="${att.photo}" alt="Foto ${att.name}" class="attendance-photo" onclick="showPhotoModal('${att.photo}', '${att.name}')" />` : '<div style="width: 80px; height: 80px; background: #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #666; font-size: 12px;">No Photo</div>';
        
        const actionButtons = `
            <div class="attendance-actions" style="margin-top: 10px;">
                <button class="btn btn-warning btn-sm" onclick="editAttendance('${att.id}', '${att.name}', '${att.nim}', '${att.status}')" style="margin-right: 5px;">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteAttendance('${att.id}', '${att.name}')">🗑️ Hapus</button>
            </div>
        `;
        
        return `
            <div class="attendance-item">
                <div class="user-info">
                    <strong>Nama:</strong> ${att.name || 'Tidak tersedia'}<br>
                    <strong>NIM:</strong> ${att.nim || 'Tidak tersedia'}<br>
                    <strong>Kelas:</strong> ${att.kelas || 'Tidak tersedia'}<br>
                    <strong>Hadir:</strong> ${statusIcon} <span class="${statusClass}">${att.status.toUpperCase()}</span><br>
                    <strong>Waktu:</strong> ${waktu}
                    ${actionButtons}
                </div>
                ${photoHtml}
            </div>
        `;
    }).join('');
}

function toggleMatkulSection(sectionId) {
    const content = document.getElementById(sectionId);
    const icon = document.getElementById(`${sectionId}-icon`);
    
    if (content.classList.contains('active')) {
        content.classList.remove('active');
        icon.textContent = '▼';
    } else {
        content.classList.add('active');
        icon.textContent = '▲';
    }
}

// Start attendance session (for dosen)
async function startAttendanceSession() {
    if (!currentUser || currentUser.role !== 'dosen') {
        alert('Hanya dosen yang bisa memulai session absensi');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/attendances/start-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dosenId: currentUser.id }),
        });

        const result = await response.json();

        if (response.ok) {
            alert('Session absensi dimulai! Mahasiswa bisa absen selama 15 menit.');
            startSessionTimer(15 * 60); // 15 minutes in seconds
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Start countdown timer
function startSessionTimer(seconds) {
    const statusDiv = document.getElementById('sessionStatus');
    const timerElement = document.getElementById('sessionTimer');

    if (sessionTimer) {
        clearInterval(sessionTimer);
    }

    isSessionExpired = false;
    
    sessionTimer = setInterval(() => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        statusDiv.innerHTML = `
            <div class="session-active">
                ⏰ Session Aktif: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}
            </div>
        `;

        if (timerElement) {
            timerElement.innerHTML = `⏰ Sisa waktu: ${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }

        if (seconds <= 0) {
            clearInterval(sessionTimer);
            isSessionExpired = true;
            statusDiv.innerHTML = `
                <div class="session-ended">
                    ❌ Session Berakhir - Mahasiswa tidak bisa absen
                </div>
            `;
            if (timerElement) {
                timerElement.innerHTML = '⏰ Session telah berakhir';
            }
            disableAttendanceForExpiredSession();
        }

        seconds--;
    }, 1000);
}

// Disable attendance when session expired
function disableAttendanceForExpiredSession() {
    const absenBtn = document.getElementById('absen-peta-btn');
    const statusDiv = document.getElementById('attendance-status');
    
    if (absenBtn && currentUser && currentUser.role === 'mahasiswa') {
        absenBtn.disabled = true;
        absenBtn.textContent = '❌ Session Berakhir';
        absenBtn.style.background = '#6c757d';
    }
    
    if (statusDiv && currentUser && currentUser.role === 'mahasiswa') {
        statusDiv.innerHTML = '❌ <strong>SESSION BERAKHIR</strong><br><small>Waktu absensi telah habis</small>';
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.style.border = '1px solid #f5c6cb';
    }
}

// Start session monitoring for mahasiswa
function startSessionMonitoring() {
    if (currentUser && currentUser.role === 'mahasiswa') {
        if (sessionCheckInterval) {
            clearInterval(sessionCheckInterval);
        }
        
        sessionCheckInterval = setInterval(async () => {
            try {
                const dosenList = await fetch(`${API_BASE}/users/dosen`);
                const dosenData = await dosenList.json();
                const dosen = dosenData.find(d => d.latitude && d.longitude);
                
                if (dosen) {
                    const sessionResponse = await fetch(`${API_BASE}/attendances/session/${dosen.id}`);
                    const sessionData = await sessionResponse.json();
                    
                    if (!sessionData.isActive && !isSessionExpired) {
                        isSessionExpired = true;
                        disableAttendanceForExpiredSession();
                        alert('⏰ Session absensi telah berakhir!\nAnda tidak bisa absen lagi.');
                    }
                }
            } catch (error) {
                console.error('Error checking session:', error);
            }
        }, 10000); // Check every 10 seconds
    }
}

// Check session status before attendance
async function checkSessionBeforeAttendance(dosenId) {
    try {
        const response = await fetch(`${API_BASE}/attendances/session/${dosenId}`);
        const result = await response.json();

        if (!result.isActive) {
            throw new Error('Session absensi tidak aktif atau sudah berakhir');
        }

        return true;
    } catch (error) {
        throw error;
    }
}

// User Management Functions
async function loadAllUsersAdmin() {
    if (currentUser.role !== 'admin') return;

    try {
        const response = await fetch(`${API_BASE}/users`);
        const users = await response.json();

        const adminUsersList = document.getElementById('adminUsersList');
        adminUsersList.innerHTML = '<h4>👥 Semua Users:</h4>';

        users.forEach((user) => {
            const roleColor =
                user.role === 'admin' ? '#dc3545' : user.role === 'dosen' ? '#28a745' : '#007bff';

            let nimNipDisplay = '';
            if (user.role === 'mahasiswa' && user.nim) {
                nimNipDisplay = `NIM: ${user.nim}<br>`;
            } else if (user.role === 'dosen' && user.nip) {
                nimNipDisplay = `NIP: ${user.nip}<br>`;
            }

            const editButton = `<button class="btn btn-warning btn-sm" onclick="openEditModal('${user.id}', '${user.name}', '${user.email}', '${user.role}', '${user.kelas || ''}')" style="margin-right: 5px;">✏️ Edit</button>`;
            
            const deleteButton =
                user.role !== 'admin'
                    ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}', '${user.name}')">🗑️ Hapus</button>`
                    : '<span class="admin-protected">🔒 Protected</span>';

            const kelasDisplay = user.kelas ? `Kelas: ${user.kelas}<br>` : '';
            
            adminUsersList.innerHTML += `
                <div class="user-item" style="border-left-color: ${roleColor}">
                    <div class="user-info">
                        <strong>${user.name}</strong> 
                        <span style="color: ${roleColor}; font-weight: bold;">(${user.role.toUpperCase()})</span><br>
                        ${nimNipDisplay}
                        ${kelasDisplay}
                        Username: ${user.email}<br>
                        ID: ${user.id}
                        ${user.latitude ? `<br>Lokasi: ${user.latitude}, ${user.longitude}` : ''}
                    </div>
                    <div class="user-actions">
                        ${editButton}
                        ${deleteButton}
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading users for admin:', error);
    }
}

// Delete user (admin only)
async function deleteUser(userId, userName) {
    if (currentUser.role !== 'admin') {
        alert('Akses ditolak! Hanya admin yang bisa menghapus user.');
        return;
    }

    const confirmDelete = confirm(
        `Apakah Anda yakin ingin menghapus user "${userName}"?\n\nTindakan ini tidak dapat dibatalkan!`
    );

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'DELETE',
        });

        const result = await response.json();

        if (response.ok) {
            alert(`User "${userName}" berhasil dihapus!`);
            // Refresh data
            loadAllUsersAdmin();
            loadStats();
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Open edit user modal
function openEditModal(userId, userName, userEmail, userRole, userKelas) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserName').value = userName;
    document.getElementById('editUserEmail').value = userEmail;
    document.getElementById('editUserRole').value = userRole;
    document.getElementById('editUserKelas').value = userKelas || '';
    document.getElementById('editUserPassword').value = '';
    document.getElementById('editUserModal').style.display = 'block';
}

// Close edit user modal
function closeEditModal() {
    document.getElementById('editUserModal').style.display = 'none';
    const editResult = document.getElementById('editUserResult');
    if (editResult) {
        editResult.innerHTML = '';
    }
}

// Edit user form handler
async function handleEditUser(event) {
    event.preventDefault();
    
    if (currentUser.role !== 'admin') {
        showResult('editUserResult', 'Akses ditolak! Hanya admin yang bisa mengedit user.', 'error');
        return;
    }
    
    const userId = document.getElementById('editUserId').value;
    const data = {
        name: document.getElementById('editUserName').value,
        email: document.getElementById('editUserEmail').value,
        role: document.getElementById('editUserRole').value,
        kelas: document.getElementById('editUserKelas').value || null
    };
    
    const newPassword = document.getElementById('editUserPassword').value;
    if (newPassword) {
        data.password = newPassword;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showResult('editUserResult', 'User berhasil diperbarui!', 'success');
            setTimeout(() => {
                closeEditModal();
                loadAllUsersAdmin();
                loadStats();
            }, 1500);
        } else {
            showResult('editUserResult', result.message || 'Gagal memperbarui user', 'error');
        }
    } catch (error) {
        showResult('editUserResult', 'Error: ' + error.message, 'error');
    }
}

// Zoom Meeting Functions
async function createZoomMeeting() {
    const title = document.getElementById('meetingTitle').value.trim();
    const matkul = document.getElementById('zoomMeetingMatkul').value;
    const kelas = document.getElementById('zoomMeetingKelas').value;
    const duration = document.getElementById('meetingDuration').value;
    const pmi = document.getElementById('personalMeetingId').value.trim();
    
    if (!title) {
        alert('❌ Masukkan judul meeting!');
        return;
    }
    
    if (!matkul) {
        alert('❌ Pilih mata kuliah!');
        return;
    }
    
    if (!kelas) {
        alert('❌ Pilih kelas!');
        return;
    }
    
    if (pmi) {
        const cleanPmi = pmi.replace(/\s+/g, '');
        if (cleanPmi.length < 9 || cleanPmi.length > 11 || !/^\d+$/.test(cleanPmi)) {
            alert('❌ Personal Meeting ID harus berupa 9-11 digit angka!\nContoh: 282 899 2827 atau 2828992827');
            return;
        }
        document.getElementById('personalMeetingId').value = cleanPmi;
    }
    
    try {
        const response = await fetch(`${API_BASE}/zoom/create-meeting`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                matakuliah: matkul,
                kelas: kelas,
                duration: parseInt(duration),
                dosenId: currentUser.id,
                pmi: pmi || null
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentMeetingId = result.meetingId;
            showActiveMeeting(result);
            showResult('createMeetingResult', 'Meeting berhasil dibuat!', 'success');
        } else {
            showResult('createMeetingResult', result.message, 'error');
        }
    } catch (error) {
        showResult('createMeetingResult', 'Error: ' + error.message, 'error');
    }
}

function showActiveMeeting(meetingData) {
    document.getElementById('activeMeetingId').textContent = meetingData.meetingId;
    document.getElementById('manualMeetingId').textContent = meetingData.meetingId;
    document.getElementById('activeMeetingUrl').href = meetingData.joinUrl;
    document.getElementById('activeMeetingUrl').textContent = meetingData.joinUrl;
    document.getElementById('activeMeetingPassword').textContent = meetingData.password || 'Tidak ada';
    document.getElementById('activeMeeting').style.display = 'block';
    document.getElementById('zoomStatus').textContent = 'Meeting Aktif';
}

function copyMeetingInfo() {
    const meetingId = document.getElementById('activeMeetingId').textContent;
    const password = document.getElementById('activeMeetingPassword').textContent;
    const joinUrl = document.getElementById('activeMeetingUrl').href;
    
    const meetingInfo = `📹 ZOOM MEETING INFO\n\n🎯 Meeting ID: ${meetingId}\n🔗 Join URL: ${joinUrl}\n🔑 Password: ${password}\n\n📱 Cara Join:\n1. Buka aplikasi Zoom\n2. Klik "Join Meeting"\n3. Masukkan Meeting ID: ${meetingId}\n4. Masukkan Password jika diminta`;
    
    navigator.clipboard.writeText(meetingInfo).then(() => {
        alert('✅ Info meeting berhasil disalin ke clipboard!');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = meetingInfo;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('✅ Info meeting berhasil disalin!');
    });
}

async function endZoomMeeting() {
    if (!currentMeetingId) {
        alert('❌ Tidak ada meeting aktif!');
        return;
    }
    
    const confirm = window.confirm('Akhiri meeting dan proses absensi otomatis?');
    if (!confirm) return;
    
    try {
        const response = await fetch(`${API_BASE}/zoom/end-meeting`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meetingId: currentMeetingId,
                dosenId: currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('activeMeeting').style.display = 'none';
            document.getElementById('zoomStatus').textContent = 'Tidak Aktif';
            currentMeetingId = null;
            alert(`✅ Meeting berakhir!\n\nAbsensi otomatis: ${result.attendanceCount} mahasiswa`);
            loadMeetingHistory();
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

function refreshParticipants() {
    if (!currentMeetingId) return;
    
    try {
        const count = Math.floor(Math.random() * 30) + 5;
        document.getElementById('participantCount').textContent = count;
    } catch (error) {
        console.error('Error refreshing participants:', error);
    }
}

async function loadMeetingHistory() {
    if (!currentUser || currentUser.role !== 'dosen') return;
    
    try {
        const response = await fetch(`${API_BASE}/zoom/meetings/${currentUser.id}`);
        const meetings = await response.json();
        
        const historyList = document.getElementById('meetingHistoryList');
        historyList.innerHTML = '<h5>📊 Riwayat Meeting:</h5>';
        
        if (meetings.length === 0) {
            historyList.innerHTML += '<p>Belum ada riwayat meeting.</p>';
            return;
        }
        
        meetings.forEach(meeting => {
            const date = new Date(meeting.createdAt).toLocaleString('id-ID');
            historyList.innerHTML += `
                <div class="meeting-item">
                    <strong>${meeting.title}</strong><br>
                    <small>Mata Kuliah: ${meeting.matakuliah}</small><br>
                    <small>Tanggal: ${date}</small><br>
                    <small>Peserta: ${meeting.attendanceCount || 0} mahasiswa</small><br>
                    <span class="badge ${meeting.status === 'ended' ? 'badge-success' : 'badge-warning'}">
                        ${meeting.status === 'ended' ? 'Selesai' : 'Aktif'}
                    </span>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading meeting history:', error);
    }
}

function setupZoomInfo() {
    if (currentUser && currentUser.role === 'dosen') {
        document.getElementById('zoomDosenName').textContent = currentUser.name || 'Tidak tersedia';
        
        const dosenMatkul = document.getElementById('dosenMatkul');
        if (dosenMatkul && dosenMatkul.value) {
            document.getElementById('zoomMatkul').textContent = dosenMatkul.value;
            document.getElementById('zoomMeetingMatkul').value = dosenMatkul.value;
        }
    }
}

// Mahasiswa Zoom Functions
function joinZoomMeeting() {
    const meetingId = document.getElementById('joinMeetingId').value.trim();
    const password = document.getElementById('joinMeetingPassword').value.trim();
    const displayName = document.getElementById('joinDisplayName').value.trim();
    const kelas = document.getElementById('joinMeetingKelas').value;
    
    if (!meetingId) {
        alert('❌ Masukkan Meeting ID!');
        return;
    }
    
    if (!displayName) {
        alert('❌ Masukkan nama untuk ditampilkan!');
        return;
    }
    
    if (!kelas) {
        alert('❌ Pilih kelas!');
        return;
    }
    
    const cleanMeetingId = meetingId.replace(/\s+/g, '');
    
    if (cleanMeetingId.length < 9 || cleanMeetingId.length > 11 || !/^\d+$/.test(cleanMeetingId)) {
        alert('❌ Meeting ID harus berupa 9-11 digit angka!\nContoh: 282 899 2827');
        return;
    }
    
    let zoomUrl = `https://zoom.us/j/${cleanMeetingId}`;
    if (password) {
        zoomUrl += `?pwd=${password}`;
    }
    
    const separator = password ? '&' : '?';
    zoomUrl += `${separator}uname=${encodeURIComponent(displayName)}`;
    
    showActiveMeetingInfo(cleanMeetingId, displayName);
    window.open(zoomUrl, '_blank');
    recordMeetingAttendance(cleanMeetingId, displayName);
    
    showResult('joinMeetingResult', `✅ Membuka Zoom Meeting...\n\nMeeting ID: ${meetingId}\nNama: ${displayName}`, 'success');
}

function showActiveMeetingInfo(meetingId, displayName) {
    document.getElementById('currentMeetingId').textContent = meetingId;
    document.getElementById('currentDisplayName').textContent = displayName;
    document.getElementById('activeMeetingInfo').style.display = 'block';
    document.getElementById('zoomMahasiswaStatus').textContent = 'Sedang dalam meeting';
    
    meetingStartTime = new Date();
    startMeetingTimer();
}

function startMeetingTimer() {
    if (currentMeetingTimer) {
        clearInterval(currentMeetingTimer);
    }
    
    currentMeetingTimer = setInterval(() => {
        if (meetingStartTime) {
            const now = new Date();
            const duration = Math.floor((now - meetingStartTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            
            document.getElementById('meetingDuration').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function leaveMeeting() {
    const confirm = window.confirm('Keluar dari meeting?');
    if (!confirm) return;
    
    document.getElementById('activeMeetingInfo').style.display = 'none';
    document.getElementById('zoomMahasiswaStatus').textContent = 'Keluar dari meeting';
    
    if (currentMeetingTimer) {
        clearInterval(currentMeetingTimer);
        currentMeetingTimer = null;
    }
    
    recordMeetingLeave();
    alert('✅ Anda telah keluar dari meeting.');
}

function toggleMute() {
    alert('🎤 Fitur mute/unmute hanya tersedia di aplikasi Zoom.');
}

function scanQRCode() {
    alert('📱 Fitur scan QR code akan tersedia di versi mobile app.');
}

async function recordMeetingAttendance(meetingId, displayName) {
    try {
        const attendanceData = {
            meetingId: meetingId,
            studentName: displayName,
            studentId: currentUser ? currentUser.id : null,
            joinTime: new Date().toISOString(),
            status: 'joined'
        };
        
        console.log('Recording attendance:', attendanceData);
        
    } catch (error) {
        console.error('Error recording attendance:', error);
    }
}

async function recordMeetingLeave() {
    try {
        const leaveData = {
            leaveTime: new Date().toISOString(),
            duration: meetingStartTime ? Math.floor((new Date() - meetingStartTime) / 1000) : 0
        };
        
        console.log('Recording leave:', leaveData);
        
    } catch (error) {
        console.error('Error recording leave:', error);
    }
}

function loadMahasiswaMeetingHistory() {
    const historyList = document.getElementById('mahasiswaMeetingHistoryList');
    
    const sampleHistory = [
        {
            meetingId: '282 899 2827',
            title: 'Kuliah Pemrograman Web',
            date: new Date(Date.now() - 86400000).toLocaleDateString('id-ID'),
            duration: '45 menit',
            status: 'Hadir'
        },
        {
            meetingId: '123 456 7890',
            title: 'Kuliah Basis Data',
            date: new Date(Date.now() - 172800000).toLocaleDateString('id-ID'),
            duration: '60 menit',
            status: 'Hadir'
        }
    ];
    
    historyList.innerHTML = '<h5>📊 Riwayat Meeting:</h5>';
    
    sampleHistory.forEach(meeting => {
        const statusClass = meeting.status === 'Hadir' ? 'badge-success' : 'badge-warning';
        historyList.innerHTML += `
            <div class="meeting-item">
                <strong>${meeting.title}</strong><br>
                <small>Meeting ID: ${meeting.meetingId}</small><br>
                <small>Tanggal: ${meeting.date}</small><br>
                <small>Durasi: ${meeting.duration}</small><br>
                <span class="badge ${statusClass}">${meeting.status}</span>
            </div>
        `;
    });
}

function setupMahasiswaZoomInfo() {
    if (currentUser && currentUser.role === 'mahasiswa') {
        document.getElementById('zoomMahasiswaName').textContent = currentUser.name || 'Tidak tersedia';
        document.getElementById('zoomMahasiswaNIM').textContent = currentUser.email || 'Tidak tersedia';
        document.getElementById('joinDisplayName').value = currentUser.name || '';
    }
}

// Additional Functions
async function findDosenByClassAndSubject() {
    const kelas = document.getElementById('mahasiswaKelas').value;
    const matkul = document.getElementById('mahasiswaMatkul').value;
    
    if (!kelas || !matkul) return;
    
    try {
        const response = await fetch(`${API_BASE}/users/dosen`);
        const dosenList = await response.json();
        
        const availableDosen = dosenList.filter(dosen => 
            dosen.latitude && dosen.longitude
        );
        
        if (availableDosen.length > 0) {
            const selectedDosen = availableDosen[0];
            
            ATTENDANCE_LOCATION.lat = selectedDosen.latitude;
            ATTENDANCE_LOCATION.lng = selectedDosen.longitude;
            ATTENDANCE_LOCATION.name = `${matkul} - ${kelas} (${selectedDosen.name})`;
            
            if (map && attendanceMarker && radiusCircle) {
                attendanceMarker.setLatLng([ATTENDANCE_LOCATION.lat, ATTENDANCE_LOCATION.lng]);
                radiusCircle.setLatLng([ATTENDANCE_LOCATION.lat, ATTENDANCE_LOCATION.lng]);
                attendanceMarker.bindPopup(`
                    <b>${ATTENDANCE_LOCATION.name}</b><br>
                    Lokasi Absensi<br>
                    Radius: ${ATTENDANCE_RADIUS}m
                `);
                map.setView([ATTENDANCE_LOCATION.lat, ATTENDANCE_LOCATION.lng], 16);
            }
            
            checkAttendanceEligibility();
        } else {
            alert('Belum ada dosen yang set lokasi. Hubungi dosen untuk mengatur lokasi kelas.');
        }
    } catch (error) {
        console.error('Error finding dosen:', error);
    }
}

function showZoomInstructions() {
    const instructions = `📹 CARA MENDAPATKAN PMI ZOOM\n\n🔴 LANGKAH-LANGKAH:\n\n1. 🌐 Buka browser, kunjungi: zoom.us\n\n2. 🔑 Klik "Sign In" dan login dengan akun Zoom Anda\n\n3. 👤 Klik "Profile" di menu atas\n\n4. 🎯 Cari "Personal Meeting ID (PMI)"\n   - Akan terlihat angka seperti: 282 899 2827\n   - Ini adalah PMI Anda\n\n5. 📋 Copy PMI tersebut\n\n6. 🔙 Kembali ke aplikasi ini\n\n7. 📝 Paste PMI di field "Personal Meeting ID"\n\n8. 🚀 Klik "Buat Meeting"\n\n✅ SEKARANG MEETING ID AKAN VALID!\n\n⚠️ PENTING:\n- Tanpa PMI = Meeting tidak akan bekerja\n- PMI harus dari akun Zoom Anda sendiri\n- Setiap orang punya PMI yang berbeda\n\n📞 Masih bingung? Tanya admin sistem.`;
    
    alert(instructions);
}

function fillExamplePMI() {
    document.getElementById('personalMeetingId').value = '282 899 2827';
    document.getElementById('meetingTitle').value = 'Test Meeting - ' + new Date().toLocaleTimeString('id-ID');
    document.getElementById('zoomMeetingMatkul').value = 'Pemrograman Web';
    alert('✅ Contoh PMI dan data meeting telah diisi!\n\nPMI: 282 899 2827\n\n⚠️ Catatan: Ini hanya contoh untuk testing UI.');
}

// Show photo modal
function showPhotoModal(photoSrc, studentName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; text-align: center;">
            <h4>📷 Foto Absensi - ${studentName}</h4>
            <img src="${photoSrc}" alt="Foto ${studentName}" style="width: 100%; max-width: 400px; border-radius: 10px; margin: 20px 0;" />
            <div class="modal-actions">
                <button type="button" onclick="closePhotoModal()" class="btn btn-secondary">Tutup</button>
            </div>
        </div>
    `;
    modal.id = 'photoModal';
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closePhotoModal();
        }
    });
}

function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.remove();
    }
}

function resetForNewSubject() {
    // Reset only subject and class selection
    document.getElementById('mahasiswaKelas').disabled = false;
    document.getElementById('mahasiswaMatkul').disabled = false;
    document.getElementById('mahasiswaKelas').value = '';
    document.getElementById('mahasiswaMatkul').value = '';
    
    const absenBtn = document.getElementById('absen-peta-btn');
    absenBtn.textContent = '✅ ABSEN SEKARANG';
    absenBtn.style.background = '#28a745';
    absenBtn.disabled = true;
    
    // Remove extra buttons
    const cancelBtn = document.querySelector('.btn-danger');
    const newSubjectBtn = document.querySelector('.btn-info');
    if (cancelBtn && cancelBtn.textContent.includes('Batal Absen')) {
        cancelBtn.remove();
    }
    if (newSubjectBtn && newSubjectBtn.textContent.includes('Mata Kuliah Lain')) {
        newSubjectBtn.remove();
    }
    
    checkAttendanceEligibility();
}

function cancelAttendance(attendanceId) {
    const confirm = window.confirm('Apakah Anda yakin ingin membatalkan absensi?');
    if (!confirm) return;
    
    let attendances = JSON.parse(localStorage.getItem('attendances') || '[]');
    attendances = attendances.filter(att => att.id !== attendanceId);
    localStorage.setItem('attendances', JSON.stringify(attendances));
    
    // Reset form
    document.getElementById('mahasiswaName').disabled = false;
    document.getElementById('mahasiswaNIM').disabled = false;
    document.getElementById('mahasiswaKelas').disabled = false;
    document.getElementById('mahasiswaMatkul').disabled = false;
    
    const absenBtn = document.getElementById('absen-peta-btn');
    absenBtn.textContent = '✅ ABSEN SEKARANG';
    absenBtn.style.background = '#28a745';
    absenBtn.disabled = false;
    
    // Remove extra buttons
    const cancelBtn = document.querySelector('.btn-danger');
    const newSubjectBtn = document.querySelector('.btn-info');
    if (cancelBtn && cancelBtn.textContent.includes('Batal Absen')) {
        cancelBtn.remove();
    }
    if (newSubjectBtn && newSubjectBtn.textContent.includes('Mata Kuliah Lain')) {
        newSubjectBtn.remove();
    }
    
    alert('✅ Absensi berhasil dibatalkan!');
}

// Update username label based on role
function updateUsernameLabel() {
    const role = document.getElementById('role').value;
    const label = document.getElementById('usernameLabel');
    const input = document.getElementById('username');
    
    if (role === 'dosen') {
        label.textContent = 'NIP..';
        input.placeholder = 'Masukkan NIP';
    } else {
        label.textContent = 'NIM..';
        input.placeholder = 'Masukkan NIM';
    }
}

// Attendance Management Functions
function editAttendance(id, name, nim, status) {
    document.getElementById('editAttendanceId').value = id;
    document.getElementById('editAttendanceName').value = name;
    document.getElementById('editAttendanceNIM').value = nim;
    document.getElementById('editAttendanceStatus').value = status;
    document.getElementById('editAttendanceModal').style.display = 'flex';
}

function closeEditAttendanceModal() {
    document.getElementById('editAttendanceModal').style.display = 'none';
    document.getElementById('editAttendanceResult').innerHTML = '';
}

async function handleEditAttendance(event) {
    event.preventDefault();
    
    const id = document.getElementById('editAttendanceId').value;
    const name = document.getElementById('editAttendanceName').value;
    const nim = document.getElementById('editAttendanceNIM').value;
    const status = document.getElementById('editAttendanceStatus').value;
    
    // Update localStorage
    let attendances = JSON.parse(localStorage.getItem('attendances') || '[]');
    const index = attendances.findIndex(att => att.id === id);
    
    if (index !== -1) {
        attendances[index].name = name;
        attendances[index].nim = nim;
        attendances[index].status = status;
        localStorage.setItem('attendances', JSON.stringify(attendances));
        
        showResult('editAttendanceResult', 'Data absensi berhasil diperbarui!', 'success');
        setTimeout(() => {
            closeEditAttendanceModal();
            loadDosenAttendances();
        }, 1500);
    } else {
        showResult('editAttendanceResult', 'Data tidak ditemukan!', 'error');
    }
}

async function deleteAttendance(id, name) {
    const confirm = window.confirm(`Hapus data absensi ${name}?`);
    if (!confirm) return;
    
    // Delete from localStorage
    let attendances = JSON.parse(localStorage.getItem('attendances') || '[]');
    attendances = attendances.filter(att => att.id !== id);
    localStorage.setItem('attendances', JSON.stringify(attendances));
    
    alert(`Data absensi ${name} berhasil dihapus!`);
    loadDosenAttendances();
}

// Attendance Tab Functions
function showAttendanceTab(tabName) {
    const tabs = document.querySelectorAll('.attendance-tab');
    const contents = document.querySelectorAll('.attendance-tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[onclick="showAttendanceTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName === 'offline' ? 'offlineAttendances' : 'zoomAttendances').classList.add('active');
}

function loadAllAttendanceData() {
    loadDosenAttendances();
    loadMeetingHistory();
}

// Global functions untuk dipanggil dari HTML
window.resetForNewSubject = resetForNewSubject;
window.cancelAttendance = cancelAttendance;
window.toggleMatkulSection = toggleMatkulSection;
window.showPhotoModal = showPhotoModal;
window.closePhotoModal = closePhotoModal;
window.updateUsernameLabel = updateUsernameLabel;
window.editAttendance = editAttendance;
window.closeEditAttendanceModal = closeEditAttendanceModal;
window.deleteAttendance = deleteAttendance;
window.showAttendanceTab = showAttendanceTab;
window.loadAllAttendanceData = loadAllAttendanceData;
window.logout = logout;
window.showTab = showTab;
window.showAdminTab = showAdminTab;
window.initMap = initMap;
window.getUserLocation = getUserLocation;
window.processAttendancePeta = processAttendancePeta;
window.initDosenMap = initDosenMap;
window.centerDosenMap = centerDosenMap;
window.getAndSaveDosenLocation = getAndSaveDosenLocation;
window.shareCurrentLocation = shareCurrentLocation;
window.startAttendanceSession = startAttendanceSession;
window.loadDosenAttendances = loadDosenAttendances;
window.createZoomMeeting = createZoomMeeting;
window.showZoomInstructions = showZoomInstructions;
window.fillExamplePMI = fillExamplePMI;
window.copyMeetingInfo = copyMeetingInfo;
window.endZoomMeeting = endZoomMeeting;
window.refreshParticipants = refreshParticipants;
window.loadMeetingHistory = loadMeetingHistory;
window.joinZoomMeeting = joinZoomMeeting;
window.leaveMeeting = leaveMeeting;
window.toggleMute = toggleMute;
window.scanQRCode = scanQRCode;
window.loadMahasiswaMeetingHistory = loadMahasiswaMeetingHistory;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteUser = deleteUser;
window.loadAllUsersAdmin = loadAllUsersAdmin;
window.toggleAdminLocationFields = toggleAdminLocationFields;
window.copyCoordinates = copyCoordinates;
window.shareLocationLink = shareLocationLink;
window.getDosenLocation = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            document.getElementById('dosenLat').value = position.coords.latitude;
            document.getElementById('dosenLng').value = position.coords.longitude;
            showResult('locationResult', 'Lokasi berhasil diambil!', 'success');
        });
    } else {
        showResult('locationResult', 'Geolocation tidak didukung browser', 'error');
    }
};
window.saveDosenLocation = async function() {
    if (!currentUser || currentUser.role !== 'dosen') {
        alert('Hanya dosen yang bisa set koordinat');
        return;
    }

    const latitude = parseFloat(document.getElementById('dosenLat').value);
    const longitude = parseFloat(document.getElementById('dosenLng').value);

    if (!latitude || !longitude) {
        showResult('locationResult', 'Masukkan koordinat yang valid!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
        });

        const result = await response.json();

        if (response.ok) {
            showResult('locationResult', 'Koordinat berhasil disimpan!', 'success');
            updateShareLocation(latitude, longitude);
        } else {
            showResult('locationResult', result.message, 'error');
        }
    } catch (error) {
        showResult('locationResult', 'Error: ' + error.message, 'error');
    }
};