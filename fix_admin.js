import { MongoClient } from 'mongodb'

const connectionString = 'mongodb+srv://hairul_db_user:OJT7SVZmeo2ZhLNH@cluster0.zweoshx.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=Cluster0'

async function fixAdmin() {
  const client = new MongoClient(connectionString)
  
  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db('attendance_system')
    const users = db.collection('users')
    
    // Delete existing admin
    const deleteResult = await users.deleteMany({ email: 'admin@untad.ac.id' })
    console.log('🗑️ Deleted', deleteResult.deletedCount, 'admin users')
    
    // Create new admin with plain password (will be hashed by AdonisJS)
    const admin = await users.insertOne({
      name: 'Super Admin UNTAD',
      email: 'admin@untad.ac.id',
      password: 'admin123', // Plain password - akan di-hash oleh AdonisJS saat register
      role: 'admin',
      latitude: null,
      longitude: null,
      sessionStart: null,
      sessionEnd: null,
      isSessionActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    console.log('✅ New admin created with ID:', admin.insertedId.toString())
    console.log('📧 Email: admin@untad.ac.id')
    console.log('🔑 Password: admin123')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.close()
  }
}

fixAdmin()