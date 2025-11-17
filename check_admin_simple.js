import { MongoClient } from 'mongodb'

const connectionString = 'mongodb+srv://hairul_db_user:OJT7SVZmeo2ZhLNH@cluster0.zweoshx.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=Cluster0'

async function checkAdmin() {
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
      console.log('Has Password:', !!admin.password)
      console.log('Password starts with:', admin.password ? admin.password.substring(0, 10) + '...' : 'No password')
      
    } else {
      console.log('❌ Admin with email "admin@untad.ac.id" not found!')
      
      // Show all users
      const allUsers = await users.find().toArray()
      console.log('\n📋 All users in database:')
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. Name: ${user.name}`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Has Password: ${!!user.password}`)
        console.log('---')
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.close()
  }
}

checkAdmin()