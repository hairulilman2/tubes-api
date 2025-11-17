import { MongoClient } from 'mongodb'

const connectionString = 'mongodb+srv://hairul_db_user:OJT7SVZmeo2ZhLNH@cluster0.zweoshx.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=Cluster0'

async function testConnection() {
  console.log('🔄 Testing MongoDB connection...')
  
  const client = new MongoClient(connectionString)
  
  try {
    console.log('🔗 Connecting to MongoDB Atlas...')
    await client.connect()
    console.log('✅ Connected successfully!')
    
    const db = client.db('attendance_system')
    console.log('📁 Database:', db.databaseName)
    
    // Test ping
    await db.admin().ping()
    console.log('🏓 Ping successful!')
    
    // List collections
    const collections = await db.listCollections().toArray()
    console.log('📋 Collections:', collections.map(c => c.name))
    
    // Test users collection
    const users = db.collection('users')
    const userCount = await users.countDocuments()
    console.log('👥 Total users:', userCount)
    
    if (userCount > 0) {
      const sampleUser = await users.findOne()
      console.log('👤 Sample user:', sampleUser?.name, sampleUser?.role)
    }
    
  } catch (error) {
    console.error('❌ Connection failed!')
    console.error('Error:', error.message)
    
    if (error.message.includes('authentication failed')) {
      console.log('🔐 Authentication issue - check username/password')
    }
    if (error.message.includes('network')) {
      console.log('🌐 Network issue - check internet connection')
    }
    if (error.message.includes('timeout')) {
      console.log('⏰ Timeout - check firewall/network')
    }
  } finally {
    await client.close()
    console.log('🔌 Connection closed')
  }
}

testConnection()