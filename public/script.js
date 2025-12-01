// Auto-detect API base URL with fallback
function getApiBase() {
  const hostname = window.location.hostname || 'localhost'
  const protocol = window.location.protocol || 'http:'
  
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
    return 'http://localhost:3333/api'
  }
  
  return `${protocol}//${hostname}:3333/api`
}

const API_BASE = getApiBase()
let currentUser = null

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault()

  const email = document.getElementById('username').value
  const password = document.getElementById('password').value
  const selectedRole = document.getElementById('role').value

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const result = await response.json()

    if (response.ok) {
      // Check if user is admin (auto-detect)
      if (result.user.role === 'admin') {
        console.log('Admin login detected')
      } else {
        // Verify role matches for non-admin users
        if (result.user.role !== selectedRole) {
          showResult('loginResult', `Role tidak sesuai! Anda login sebagai ${selectedRole} tapi akun Anda adalah ${result.user.role}. Silakan pilih role yang benar.`, 'error')
          return
        }
      }
      console.log('Login successful for role:', result.user.role)

      currentUser = result.user
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result.user))

      // Show main app and hide login
      document.getElementById('loginScreen').style.display = 'none'
      document.getElementById('mainApp').style.display = 'block'
      document.body.classList.remove('login-mode')

      // Setup UI based on actual user role
      setupUIForRole(result.user.role)

      console.log('Setting up UI for role:', result.user.role)

      showResult('loginResult', 'Login berhasil!', 'success')
    } else {
      let errorMessage = result.message
      if (result.message === 'Invalid credentials') {
        errorMessage = 'Username atau password salah! Pastikan Anda memasukkan NIM/NIP dan password yang benar.'
      }
      showResult('loginResult', errorMessage, 'error')
    }
  } catch (error) {
    showResult('loginResult', 'Error: ' + error.message, 'error')
  }
})

// Setup UI based on user role
function setupUIForRole(role) {
  const absenPetaTab = document.getElementById('absenPetaTab')
  const zoomMahasiswaTab = document.getElementById('zoomMahasiswaTab')
  const adminTab = document.getElementById('adminTab')
  const dosenTab = document.getElementById('dosenTab')
  const zoomTab = document.getElementById('zoomTab')

  // Hide all tabs first
  absenPetaTab.style.display = 'none'
  zoomMahasiswaTab.style.display = 'none'
  adminTab.style.display = 'none'
  dosenTab.style.display = 'none'
  zoomTab.style.display = 'none'

  switch (role) {
    case 'mahasiswa':
      absenPetaTab.style.display = 'block'
      zoomMahasiswaTab.style.display = 'block'
      absenPetaTab.click()
      break

    case 'dosen':
      dosenTab.style.display = 'block'
      zoomTab.style.display = 'block'
      dosenTab.click()
      setupDosenInfo()
      loadDosenAttendances()
      break

    case 'admin':
      console.log('Setting up admin UI')
      adminTab.style.display = 'block'
      // Manually trigger admin tab
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
      document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'))
      adminTab.classList.add('active')
      document.getElementById('admin').classList.add('active')
      loadStats()
      break
  }
}

// Tab switching
function showTab(tabName) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
  document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'))

  if (event && event.target) {
    event.target.classList.add('active')
  } else {
    // Find and activate the correct tab
    const tabButton = document.querySelector(`[onclick="showTab('${tabName}')"]`)
    if (tabButton) tabButton.classList.add('active')
  }

  const tabContent = document.getElementById(tabName)
  if (tabContent) tabContent.classList.add('active')
}

// Admin tab switching
function showAdminTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'))
  document.querySelectorAll('.admin-tab-content').forEach((t) => t.classList.remove('active'))

  event.target.classList.add('active')
  document
    .getElementById('admin' + tabName.charAt(0).toUpperCase() + tabName.slice(1))
    .classList.add('active')
}

// Show result message
function showResult(elementId, message, type) {
  const result = document.getElementById(elementId)
  result.textContent = message
  result.className = `result ${type}`
  result.style.display = 'block'

  setTimeout(() => {
    result.style.display = 'none'
  }, 5000)
}

// Admin register form
document.getElementById('adminRegisterForm').addEventListener('submit', async function (e) {
  e.preventDefault()

  if (currentUser.role !== 'admin') {
    showResult(
      'adminRegisterResult',
      'Akses ditolak! Hanya admin yang bisa mendaftarkan user.',
      'error'
    )
    return
  }

  const role = document.getElementById('adminRegRole').value
  const nimNipValue = document.getElementById('adminRegEmail').value

  const data = {
    name: document.getElementById('adminRegName').value,
    email: nimNipValue, // Use as username
    password: document.getElementById('adminRegPassword').value,
    role: role,
  }

  // Add NIM or NIP based on role
  if (role === 'mahasiswa') {
    data.nim = nimNipValue
  } else if (role === 'dosen') {
    data.nip = nimNipValue
    // Lokasi akan diset oleh dosen sendiri setelah login
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (response.ok) {
      showResult(
        'adminRegisterResult',
        `User ${data.role} berhasil didaftarkan! ID: ${result.user.id}`,
        'success'
      )
      document.getElementById('adminRegisterForm').reset()
      loadStats()
    } else {
      showResult('adminRegisterResult', result.message, 'error')
    }
  } catch (error) {
    showResult('adminRegisterResult', 'Error: ' + error.message, 'error')
  }
})

// Toggle info fields for dosen
function toggleAdminLocationFields() {
  const role = document.getElementById('adminRegRole').value
  const locationFields = document.getElementById('adminLocationFields')
  const emailLabel = document.getElementById('adminRegEmailLabel')
  const emailInput = document.getElementById('adminRegEmail')

  if (role === 'dosen') {
    locationFields.style.display = 'block'
    emailLabel.textContent = 'NIP:'
    emailInput.placeholder = 'Masukkan NIP'
  } else {
    locationFields.style.display = 'none'
    emailLabel.textContent = 'NIM:'
    emailInput.placeholder = 'Masukkan NIM'
  }
}

// Initialize form when page loads
document.addEventListener('DOMContentLoaded', function () {
  // Initialize admin form
  if (document.getElementById('adminRegRole')) {
    toggleAdminLocationFields()
  }
})

// Load statistics for admin
async function loadStats() {
  if (currentUser.role !== 'admin') return

  try {
    const response = await fetch(`${API_BASE}/users`)
    const users = await response.json()

    const totalUsers = users.length
    const totalDosen = users.filter((u) => u.role === 'dosen').length
    const totalMahasiswa = users.filter((u) => u.role === 'mahasiswa').length

    document.getElementById('totalUsers').textContent = totalUsers
    document.getElementById('totalDosen').textContent = totalDosen
    document.getElementById('totalMahasiswa').textContent = totalMahasiswa
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

// Setup dosen info
function setupDosenInfo() {
  if (currentUser && currentUser.role === 'dosen') {
    document.getElementById('dosenName').textContent = currentUser.name || 'Tidak tersedia'
    document.getElementById('dosenNIP').textContent = currentUser.email || 'Tidak tersedia'
    
    // Event listener untuk mata kuliah dosen
    const dosenMatkul = document.getElementById('dosenMatkul')
    if (dosenMatkul) {
      dosenMatkul.addEventListener('change', function() {
        console.log('Mata kuliah dosen dipilih:', this.value)
      })
    }
  }
}





// Logout function
function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  currentUser = null

  document.getElementById('loginScreen').style.display = 'block'
  document.getElementById('mainApp').style.display = 'none'
  document.body.classList.add('login-mode')

  // Reset forms
  document.getElementById('loginForm').reset()
  showResult('loginResult', 'Logout berhasil!', 'success')
}



// Calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lon2-lon1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}



let currentLat = null
let currentLng = null
let sessionTimer = null
let cameraStream = null
let capturedPhoto = null
let isProcessingAbsen = false

// Get current location for dosen
function getDosenLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      document.getElementById('dosenLat').value = position.coords.latitude
      document.getElementById('dosenLng').value = position.coords.longitude
      showResult('locationResult', 'Lokasi berhasil diambil!', 'success')
    })
  } else {
    showResult('locationResult', 'Geolocation tidak didukung browser', 'error')
  }
}

// Save dosen location
async function saveDosenLocation() {
  if (!currentUser || currentUser.role !== 'dosen') {
    alert('Hanya dosen yang bisa set koordinat')
    return
  }

  const latitude = parseFloat(document.getElementById('dosenLat').value)
  const longitude = parseFloat(document.getElementById('dosenLng').value)

  if (!latitude || !longitude) {
    showResult('locationResult', 'Masukkan koordinat yang valid!', 'error')
    return
  }

  try {
    const response = await fetch(`${API_BASE}/users/${currentUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    })

    const result = await response.json()

    if (response.ok) {
      showResult('locationResult', 'Koordinat berhasil disimpan!', 'success')
      // Update share location display
      updateShareLocation(latitude, longitude)
    } else {
      showResult('locationResult', result.message, 'error')
    }
  } catch (error) {
    showResult('locationResult', 'Error: ' + error.message, 'error')
  }
}

// Update share location display
function updateShareLocation(lat, lng) {
  const shareDiv = document.getElementById('shareLocation')
  if (shareDiv) {
    shareDiv.innerHTML = `
            <div class="share-info">
                <h5>📍 Koordinat Absensi Aktif:</h5>
                <p><strong>Latitude:</strong> ${lat}</p>
                <p><strong>Longitude:</strong> ${lng}</p>
                <button class="btn btn-info btn-sm" onclick="copyCoordinates(${lat}, ${lng})">📋 Copy Koordinat</button>
                <button class="btn btn-warning btn-sm" onclick="shareLocationLink(${lat}, ${lng})">🔗 Share Link</button>
            </div>
        `
  }
}

// Copy coordinates to clipboard
function copyCoordinates(lat, lng) {
  const text = `Latitude: ${lat}, Longitude: ${lng}`
  navigator.clipboard.writeText(text).then(() => {
    alert('Koordinat berhasil disalin!')
  })
}

// Share location link
function shareLocationLink(lat, lng) {
  const googleMapsLink = `https://maps.google.com/?q=${lat},${lng}`
  navigator.clipboard.writeText(googleMapsLink).then(() => {
    alert('Link Google Maps berhasil disalin!')
  })
}

// Share current location for dosen
function shareCurrentLocation() {
  if (!currentUser || currentUser.role !== 'dosen') {
    alert('Hanya dosen yang bisa share lokasi')
    return
  }

  const lat = document.getElementById('dosenLat').value
  const lng = document.getElementById('dosenLng').value

  if (!lat || !lng) {
    alert('Set koordinat terlebih dahulu!')
    return
  }

  const shareText = `Lokasi Absensi:\nDosen: ${currentUser.name}\nLatitude: ${lat}\nLongitude: ${lng}\nGoogle Maps: https://maps.google.com/?q=${lat},${lng}`

  if (navigator.share) {
    navigator.share({
      title: 'Lokasi Absensi',
      text: shareText,
    })
  } else {
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Informasi lokasi berhasil disalin ke clipboard!')
    })
  }
}

// Delete user (admin only)
async function deleteUser(userId, userName) {
  if (currentUser.role !== 'admin') {
    alert('Akses ditolak! Hanya admin yang bisa menghapus user.')
    return
  }

  const confirmDelete = confirm(
    `Apakah Anda yakin ingin menghapus user "${userName}"?\n\nTindakan ini tidak dapat dibatalkan!`
  )

  if (!confirmDelete) {
    return
  }

  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
    })

    const result = await response.json()

    if (response.ok) {
      alert(`User "${userName}" berhasil dihapus!`)
      // Refresh data
      loadAllUsersAdmin()
      loadStats()
    } else {
      alert(result.message)
    }
  } catch (error) {
    alert('Error: ' + error.message)
  }
}

// Start attendance session (for dosen)
async function startAttendanceSession() {
  if (!currentUser || currentUser.role !== 'dosen') {
    alert('Hanya dosen yang bisa memulai session absensi')
    return
  }

  try {
    const response = await fetch(`${API_BASE}/attendances/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dosenId: currentUser.id }),
    })

    const result = await response.json()

    if (response.ok) {
      alert('Session absensi dimulai! Mahasiswa bisa absen selama 15 menit.')
      startSessionTimer(15 * 60) // 15 minutes in seconds
    } else {
      alert(result.message)
    }
  } catch (error) {
    alert('Error: ' + error.message)
  }
}

// Start countdown timer
function startSessionTimer(seconds) {
  const statusDiv = document.getElementById('sessionStatus')

  if (sessionTimer) {
    clearInterval(sessionTimer)
  }

  sessionTimer = setInterval(() => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    statusDiv.innerHTML = `
            <div class="session-active">
                ⏰ Session Aktif: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}
            </div>
        `

    if (seconds <= 0) {
      clearInterval(sessionTimer)
      statusDiv.innerHTML = `
                <div class="session-ended">
                    ❌ Session Berakhir - Mahasiswa tidak bisa absen
                </div>
            `
    }

    seconds--
  }, 1000)
}

// Check session status before attendance
async function checkSessionBeforeAttendance(dosenId) {
  try {
    const response = await fetch(`${API_BASE}/attendances/session/${dosenId}`)
    const result = await response.json()

    if (!result.isActive) {
      throw new Error('Session absensi tidak aktif atau sudah berakhir')
    }

    return true
  } catch (error) {
    throw error
  }
}

// Camera functions
async function startCamera() {
  try {
    const video = document.getElementById('cameraVideo')
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user' } 
    })
    
    cameraStream = stream
    video.srcObject = stream
    video.style.display = 'block'
    
    document.getElementById('takePhotoBtn').disabled = false
    showResult('absenResult', 'Kamera berhasil diaktifkan!', 'success')
  } catch (error) {
    showResult('absenResult', 'Gagal mengakses kamera: ' + error.message, 'error')
  }
}

function takePhoto() {
  const video = document.getElementById('cameraVideo')
  const canvas = document.getElementById('cameraCanvas')
  const preview = document.getElementById('photoPreview')
  
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0)
  
  capturedPhoto = canvas.toDataURL('image/jpeg', 0.8)
  
  preview.innerHTML = `<img src="${capturedPhoto}" alt="Foto Absensi">`
  
  // Hide video, show retake button
  video.style.display = 'none'
  document.getElementById('retakeBtn').style.display = 'inline-block'
  document.getElementById('takePhotoBtn').disabled = true
  
  // Stop camera stream
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop())
  }
  
  showResult('absenResult', 'Foto berhasil diambil! Memproses absensi...', 'success')
  
  // Auto submit after photo taken
  setTimeout(() => {
    document.getElementById('absenForm').dispatchEvent(new Event('submit'))
  }, 1000)
}

function retakePhoto() {
  const preview = document.getElementById('photoPreview')
  preview.innerHTML = ''
  capturedPhoto = null
  
  document.getElementById('retakeBtn').style.display = 'none'
  document.getElementById('takePhotoBtn').disabled = false
  
  // Restart camera
  startCamera()
}

// Load attendances for dosen
async function loadDosenAttendances() {
  if (!currentUser || currentUser.role !== 'dosen') return

  try {
    const response = await fetch(`${API_BASE}/attendances`)
    const attendances = await response.json()

    // Filter attendances for this dosen
    const dosenAttendances = attendances.filter(att => att.dosenId === currentUser.id)

    const attendancesList = document.getElementById('dosenAttendancesList')
    attendancesList.innerHTML = `<h5>📋 Absensi untuk ${currentUser.name}:</h5>`

    if (dosenAttendances.length === 0) {
      attendancesList.innerHTML += '<p>Belum ada data absensi.</p>'
      return
    }

    dosenAttendances.forEach((att) => {
      let statusClass = 'status-tidak-hadir'
      let statusIcon = '❌'
      if (att.status === 'hadir') {
        statusClass = 'status-hadir'
        statusIcon = '✅'
      } else if (att.status === 'terlambat') {
        statusClass = 'status-terlambat'
        statusIcon = '⚠️'
      }

      attendancesList.innerHTML += `
                <div class="attendance-item">
                    <strong>Mahasiswa ID:</strong> ${att.userId}<br>
                    <strong>Status:</strong> ${statusIcon} <span class="${statusClass}">${att.status.toUpperCase()}</span><br>
                    <strong>Jarak:</strong> ${att.distance}m<br>
                    <strong>Waktu:</strong> ${new Date(att.createdAt).toLocaleString('id-ID')}<br>
                    <strong>Lokasi:</strong> ${att.latitude}, ${att.longitude}
                </div>
            `
    })
  } catch (error) {
    console.error('Error loading dosen attendances:', error)
    const attendancesList = document.getElementById('dosenAttendancesList')
    attendancesList.innerHTML = '<p class="error">Error loading data absensi.</p>'
  }
}

// Open edit user modal
function openEditModal(userId, userName, userEmail, userRole) {
  document.getElementById('editUserId').value = userId
  document.getElementById('editUserName').value = userName
  document.getElementById('editUserEmail').value = userEmail
  document.getElementById('editUserRole').value = userRole
  document.getElementById('editUserPassword').value = ''
  document.getElementById('editUserModal').style.display = 'block'
}

// Close edit user modal
function closeEditModal() {
  document.getElementById('editUserModal').style.display = 'none'
  document.getElementById('editUserResult').innerHTML = ''
}

// Close modal when clicking outside or pressing Escape
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('editUserModal')
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeEditModal()
      }
    })
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal && modal.style.display === 'block') {
      closeEditModal()
    }
  })
})

// Edit user form handler
document.addEventListener('DOMContentLoaded', function() {
  const editForm = document.getElementById('editUserForm')
  if (editForm) {
    editForm.addEventListener('submit', async function(e) {
      e.preventDefault()
      
      if (currentUser.role !== 'admin') {
        showResult('editUserResult', 'Akses ditolak! Hanya admin yang bisa mengedit user.', 'error')
        return
      }
      
      const userId = document.getElementById('editUserId').value
      const data = {
        name: document.getElementById('editUserName').value,
        email: document.getElementById('editUserEmail').value,
        role: document.getElementById('editUserRole').value
      }
      
      const newPassword = document.getElementById('editUserPassword').value
      if (newPassword) {
        data.password = newPassword
      }
      
      try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(data)
        })
        
        const result = await response.json()
        
        if (response.ok) {
          showResult('editUserResult', 'User berhasil diperbarui!', 'success')
          setTimeout(() => {
            closeEditModal()
            loadAllUsersAdmin()
            loadStats()
          }, 1500)
        } else {
          showResult('editUserResult', result.message || 'Gagal memperbarui user', 'error')
        }
      } catch (error) {
        showResult('editUserResult', 'Error: ' + error.message, 'error')
      }
    })
  }
})

// Load all users for admin
async function loadAllUsersAdmin() {
  if (currentUser.role !== 'admin') return

  try {
    const response = await fetch(`${API_BASE}/users`)
    const users = await response.json()

    const adminUsersList = document.getElementById('adminUsersList')
    adminUsersList.innerHTML = '<h4>👥 Semua Users:</h4>'

    users.forEach((user) => {
      const roleColor =
        user.role === 'admin' ? '#dc3545' : user.role === 'dosen' ? '#28a745' : '#007bff'

      let nimNipDisplay = ''
      if (user.role === 'mahasiswa' && user.nim) {
        nimNipDisplay = `NIM: ${user.nim}<br>`
      } else if (user.role === 'dosen' && user.nip) {
        nimNipDisplay = `NIP: ${user.nip}<br>`
      }

      const editButton = `<button class="btn btn-warning btn-sm" onclick="openEditModal('${user.id}', '${user.name}', '${user.email}', '${user.role}')" style="margin-right: 5px;">✏️ Edit</button>`
      
      const deleteButton =
        user.role !== 'admin'
          ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}', '${user.name}')">🗑️ Hapus</button>`
          : '<span class="admin-protected">🔒 Protected</span>'

      adminUsersList.innerHTML += `
                <div class="user-item" style="border-left-color: ${roleColor}">
                    <div class="user-info">
                        <strong>${user.name}</strong> 
                        <span style="color: ${roleColor}; font-weight: bold;">(${user.role.toUpperCase()})</span><br>
                        ${nimNipDisplay}
                        Username: ${user.email}<br>
                        ID: ${user.id}
                        ${user.latitude ? `<br>Lokasi: ${user.latitude}, ${user.longitude}` : ''}
                    </div>
                    <div class="user-actions">
                        ${editButton}
                        ${deleteButton}
                    </div>
                </div>
            `
    })
  } catch (error) {
    console.error('Error loading users for admin:', error)
  }
}
