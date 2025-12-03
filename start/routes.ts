import router from '@adonisjs/core/services/router'

const MongoDBController = () => import('#controllers/mongodb_controller')
const AdminController = () => import('#controllers/admin_controller')

router.get('/test', async ({ response }) => {
  return response.json({ test: 'API working', users: 5 })
})

router.get('/api', async ({ response }) => {
  return response.json({ message: 'UNTAD Absensi API is running' })
})

router.get('/api/debug/users', [MongoDBController, 'debugUsers'])

router.post('/api/auth/register', [MongoDBController, 'register'])
router.post('/api/auth/login', [MongoDBController, 'login'])

router.post('/api/admin/register-dosen', [AdminController, 'registerDosen'])
router.post('/api/admin/register-mahasiswa', [AdminController, 'registerMahasiswa'])
router.get('/api/admin/users', [AdminController, 'getAllUsers'])
router.get('/api/admin/dosen', [AdminController, 'getAllDosen'])
router.get('/api/admin/mahasiswa', [AdminController, 'getAllMahasiswa'])
router.put('/api/admin/users/:id', [AdminController, 'updateUser'])
router.delete('/api/admin/users/:id', [AdminController, 'deleteUser'])
router.put('/api/admin/users/:id/reset-password', [AdminController, 'resetPassword'])

router.get('/api/users', [MongoDBController, 'getUsers'])
router.get('/api/users/dosen', [MongoDBController, 'getDosen'])
router.put('/api/users/:id', [MongoDBController, 'updateUser'])
router.delete('/api/users/:id', [MongoDBController, 'deleteUser'])

router.get('/api/attendances', [MongoDBController, 'getAttendances'])
router.post('/api/attendances', [MongoDBController, 'createAttendance'])
router.put('/api/attendances/:id', [MongoDBController, 'updateAttendance'])
router.delete('/api/attendances/:id', [MongoDBController, 'deleteAttendance'])
router.post('/api/attendances/start-session', [MongoDBController, 'startAttendanceSession'])
router.get('/api/attendances/session/:dosenId', [MongoDBController, 'checkSessionStatus'])

// Zoom Integration Routes
router.post('/api/zoom/webhook', [MongoDBController, 'handleZoomWebhook'])
router.post('/api/zoom/create-meeting', [MongoDBController, 'createZoomMeeting'])
router.get('/api/zoom/meetings/:dosenId', [MongoDBController, 'getZoomMeetings'])
router.post('/api/zoom/end-meeting', [MongoDBController, 'endZoomMeeting'])
router.post('/api/zoom/record-attendance', [MongoDBController, 'recordZoomAttendance'])
router.get('/api/zoom/attendance/:studentId', [MongoDBController, 'getStudentZoomAttendance'])

router.get('/', async ({ response }) => {
  return response.json({ message: 'UNTAD Absensi API Server', version: '1.0.0' })
})

router.get('/web', async ({ response }) => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const filePath = path.join(process.cwd(), 'public', 'index.html')
  const content = fs.readFileSync(filePath, 'utf8')
  return response.type('html').send(content)
})

router.get('/style.css', async ({ response }) => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const filePath = path.join(process.cwd(), 'public', 'style.css')
  const content = fs.readFileSync(filePath, 'utf8')
  return response.header('Content-Type', 'text/css').send(content)
})

router.get('/script.js', async ({ response }) => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const filePath = path.join(process.cwd(), 'public', 'script.js')
  const content = fs.readFileSync(filePath, 'utf8')
  return response.header('Content-Type', 'application/javascript').send(content)
})
