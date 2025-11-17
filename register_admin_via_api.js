// Register admin via API
async function registerAdmin() {
  try {
    const response = await fetch('http://localhost:3333/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Super Admin UNTAD',
        email: 'admin@untad.ac.id',
        password: 'admin123',
        role: 'admin'
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Admin registered successfully!')
      console.log('Response:', result)
    } else {
      console.log('❌ Registration failed:', result.message)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

registerAdmin()