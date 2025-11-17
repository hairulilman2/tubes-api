import { MongoClient } from 'mongodb'
import crypto from 'crypto'

const connectionString = 'mongodb+srv://hairul_db_user:OJT7SVZmeo2ZhLNH@cluster0.zweoshx.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=Cluster0'

// Simulate AdonisJS scrypt hash
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `$scrypt$n=16384,r=8,p=1$${salt}$${hash}`
}

async function createCorrectAdmin() {
  const client = new MongoClient(connectionString)
  
  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db('attendance_system')
    const users = db.collection('users')
    
    // Delete existing admin
    await users.deleteMany({ email: 'admin@untad.ac.id' })
    console.log('🗑️ Deleted existing admin')
    
    // Create admin with scrypt hash (like AdonisJS)
    const hashedPassword = hashPassword('admin123')
    
    const admin = await users.insertOne({
      name: 'Super Admin UNTAD',
      email: 'admin@untad.ac.id',
      password: hashedPassword,
      role: 'admin',
      latitude: null,
      longitude: null,
      sessionStart: null,
      sessionEnd: null,
      isSessionActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    console.log('✅ Admin created with scrypt hash')
    console.log('📧 Email: admin@untad.ac.id')
    console.log('🔑 Password: admin123')
    console.log('🆔 ID:', admin.insertedId.toString())
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.close()
  }
}

createCorrectAdmin()