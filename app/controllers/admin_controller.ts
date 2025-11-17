import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import mongoService from '#services/mongodb_service'
import { ObjectId } from 'mongodb'
// Define MongoUser interface locally to avoid import issues
interface MongoUser {
  _id?: any
  id?: string
  name: string
  email: string
  password: string
  role: 'admin' | 'dosen' | 'mahasiswa'
  nim?: string
  nip?: string
  latitude?: number
  longitude?: number
  sessionStart?: Date
  sessionEnd?: Date
  isSessionActive?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export default class AdminController {
  // Middleware untuk memastikan hanya admin yang bisa akses
  private async verifyAdmin(request: any, response: any): Promise<MongoUser | null> {
    const authHeader = request.header('authorization')
    if (!authHeader) {
      response.status(401).json({ message: 'Token required' })
      return null
    }

    try {
      await mongoService.connect()
      const token = authHeader.replace('Bearer ', '')
      const decoded = Buffer.from(token, 'base64').toString('ascii')
      const [userId] = decoded.split(':')

      const user = (await mongoService.findOne('users', {
        _id: new ObjectId(userId),
      })) as MongoUser | null
      if (!user || user.role !== 'admin') {
        response.status(403).json({ message: 'Admin access required' })
        return null
      }

      return user
    } catch (error) {
      console.error('Admin verification error:', error)
      response.status(401).json({ message: 'Invalid token' })
      return null
    }
  }

  // Register dosen oleh admin
  async registerDosen({ request, response }: HttpContext) {
    const admin = await this.verifyAdmin(request, response)
    if (!admin) return

    try {
      const { name, email, password, latitude, longitude } = request.only([
        'name',
        'email',
        'password',
        'latitude',
        'longitude',
      ])

      // Cek apakah email sudah ada
      const existingUser = await mongoService.findOne('users', { email })
      if (existingUser) {
        return response.status(400).json({ message: 'Email already exists' })
      }

      const hashedPassword = await hash.make(password)

      const dosen = await mongoService.insertOne('users', {
        name,
        email,
        password: hashedPassword,
        role: 'dosen',
        latitude,
        longitude,
      })

      return response.status(201).json({
        message: 'Dosen registered successfully',
        user: {
          id: dosen.id,
          name: dosen.name,
          email: dosen.email,
          role: dosen.role,
        },
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  // Register mahasiswa oleh admin
  async registerMahasiswa({ request, response }: HttpContext) {
    const admin = await this.verifyAdmin(request, response)
    if (!admin) return

    try {
      const { name, email, password, latitude, longitude } = request.only([
        'name',
        'email',
        'password',
        'latitude',
        'longitude',
      ])

      // Cek apakah email sudah ada
      const existingUser = await mongoService.findOne('users', { email })
      if (existingUser) {
        return response.status(400).json({ message: 'Email already exists' })
      }

      const hashedPassword = await hash.make(password)

      const mahasiswa = await mongoService.insertOne('users', {
        name,
        email,
        password: hashedPassword,
        role: 'mahasiswa',
        latitude,
        longitude,
      })

      return response.status(201).json({
        message: 'Mahasiswa registered successfully',
        user: {
          id: mahasiswa.id,
          name: mahasiswa.name,
          email: mahasiswa.email,
          role: mahasiswa.role,
        },
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  // Get semua dosen (untuk admin)
  async getAllDosen({ request, response }: HttpContext) {
    const admin = await this.verifyAdmin(request, response)
    if (!admin) return

    try {
      const dosen = await mongoService.find('users', { role: 'dosen' })
      return response.json(dosen)
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  // Get semua mahasiswa (untuk admin)
  async getAllMahasiswa({ request, response }: HttpContext) {
    const admin = await this.verifyAdmin(request, response)
    if (!admin) return

    try {
      const mahasiswa = await mongoService.find('users', { role: 'mahasiswa' })
      return response.json(mahasiswa)
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  // Get semua users (untuk admin)
  async getAllUsers({ request, response }: HttpContext) {
    const admin = await this.verifyAdmin(request, response)
    if (!admin) return

    try {
      const users = await mongoService.find('users')
      return response.json(users)
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  // Update user (admin only)
  async updateUser({ request, response, params }: HttpContext) {
    const admin = await this.verifyAdmin(request, response)
    if (!admin) return

    try {
      const user = await mongoService.findOne('users', { _id: new ObjectId(params.id) })
      if (!user) {
        return response.status(404).json({ message: 'User not found' })
      }

      const { name, email, latitude, longitude } = request.only([
        'name',
        'email',
        'latitude',
        'longitude',
      ])

      // Cek email duplikat jika email diubah
      if (email && email !== user.email) {
        const existingUser = await mongoService.findOne('users', { email })
        if (existingUser) {
          return response.status(400).json({ message: 'Email already exists' })
        }
      }

      const updateData: any = {}
      if (name) updateData.name = name
      if (email) updateData.email = email
      if (latitude !== undefined) updateData.latitude = latitude
      if (longitude !== undefined) updateData.longitude = longitude

      await mongoService.updateOne('users', { _id: new ObjectId(params.id) }, updateData)

      const updatedUser = await mongoService.findOne('users', { _id: new ObjectId(params.id) })

      return response.json({
        message: 'User updated successfully',
        user: {
          id: updatedUser?.id,
          name: updatedUser?.name,
          email: updatedUser?.email,
          role: updatedUser?.role,
        },
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  // Delete user (admin only)
  async deleteUser({ request, response, params }: HttpContext) {
    const admin = await this.verifyAdmin(request, response)
    if (!admin) return

    try {
      const user = await mongoService.findOne('users', { _id: new ObjectId(params.id) })
      if (!user) {
        return response.status(404).json({ message: 'User not found' })
      }

      // Tidak bisa hapus admin
      if (user.role === 'admin') {
        return response.status(403).json({ message: 'Cannot delete admin user' })
      }

      await mongoService.deleteOne('users', { _id: new ObjectId(params.id) })
      return response.json({ message: 'User deleted successfully' })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  // Reset password user (admin only)
  async resetPassword({ request, response, params }: HttpContext) {
    const admin = await this.verifyAdmin(request, response)
    if (!admin) return

    try {
      const user = await mongoService.findOne('users', { _id: new ObjectId(params.id) })
      if (!user) {
        return response.status(404).json({ message: 'User not found' })
      }

      const { newPassword } = request.only(['newPassword'])
      const hashedPassword = await hash.make(newPassword)

      await mongoService.updateOne(
        'users',
        { _id: new ObjectId(params.id) },
        { password: hashedPassword }
      )

      return response.json({ message: 'Password reset successfully' })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }
}
