import { MongoClient } from 'mongodb'
import bcrypt from 'bcrypt'

const connectionString = 'mongodb+srv://hairul_db_user:OJT7SVZmeo2ZhLNH@cluster0.zweoshx.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=Cluster0'

async function checkAdminDetail() {
  const client = new MongoClient(connectionString)
  
  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db('attendance_system')
    const users = db.collection('users')
    
    // Find admin user
    const admin = await users.findOne({ email: 'admin@untad.ac.id' })
    
    if (admin) {
      console.log('✅ Admin found:')
      console.log('Name:', admin.name)
      console.log('Email:', admin.email)
      console.log('Role:', admin.role)
      console.log('Password Hash:', admin.password)
      
      // Test password
      const testPassword = 'admin123'
      const isValid = await bcrypt.compare(testPassword, admin.password)
      console.log('Password "admin123" valid:', isValid)
      
    } else {
      console.log('❌ Admin not found!')
      
      // Show all users
      const allUsers = await users.find().toArray()
      console.log('All users in database:')
      allUsers.forEach(user => {
        console.log(`- ${user.name} (${user.role}) - ${user.email}`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.close()
  }
}

checkAdminDetail()