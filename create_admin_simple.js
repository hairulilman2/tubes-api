import { MongoClient } from 'mongodb'
import bcrypt from 'bcrypt'

const connectionString = 'mongodb+srv://hairul_db_user:OJT7SVZmeo2ZhLNH@cluster0.zweoshx.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=Cluster0'

async function createAdmin() {
  const client = new MongoClient(connectionString)
  
  try {
    console.log('🔄 Connecting to MongoDB...')
    await client.connect()
    console.log('✅ Connected!')
    
    const db = client.db('attendance_system')
    const users = db.collection('users')
    
    // Check if admin exists
    const existingAdmin = await users.findOne({ email: 'admin@untad.ac.id' })
    if (existingAdmin) {
      console.log('⚠️ Admin already exists!')
      console.log('Email: admin@untad.ac.id')
      console.log('Password: admin123')
      return
    }
    
    // Create admin
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
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
    
    console.log('✅ Admin created successfully!')
    console.log('📧 Email: admin@untad.ac.id')
    console.log('🔑 Password: admin123')
    console.log('🆔 ID:', admin.insertedId.toString())
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    
    if (error.message.includes('authentication failed')) {
      console.log('🔐 Check MongoDB Atlas credentials')
      console.log('1. Go to Database Access')
      console.log('2. Check username: hairul_db_user')
      console.log('3. Reset password if needed')
      console.log('4. Update .env file')
    }
  } finally {
    await client.close()
  }
}

createAdmin()