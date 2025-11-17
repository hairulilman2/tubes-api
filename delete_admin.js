import { MongoClient } from 'mongodb'

const connectionString = 'mongodb+srv://hairul_db_user:OJT7SVZmeo2ZhLNH@cluster0.zweoshx.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=Cluster0'

async function deleteAdmin() {
  const client = new MongoClient(connectionString)
  
  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db('attendance_system')
    const users = db.collection('users')
    
    // Delete all admin users
    const result = await users.deleteMany({ email: 'admin@untad.ac.id' })
    console.log('🗑️ Deleted', result.deletedCount, 'admin users')
    
    // Show remaining users
    const remainingUsers = await users.find().toArray()
    console.log('👥 Remaining users:', remainingUsers.length)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.close()
  }
}

deleteAdmin()