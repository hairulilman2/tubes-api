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

export default class MongoDBController {
  async register({ request, response }: HttpContext) {
    try {
      await mongoService.connect()

      const { name, email, password, role, latitude, longitude, nim, nip } = request.only([
        'name',
        'email',
        'password',
        'role',
        'latitude',
        'longitude',
        'nim',
        'nip',
      ])

      // Validate required fields
      if (!name || !email || !password || !role) {
        return response.status(400).json({
          message: 'Missing required fields: name, email, password, role',
        })
      }

      // Use email as username, but store NIM/NIP separately
      const identifier = email
      const nimNip = role === 'mahasiswa' ? nim : role === 'dosen' ? nip : null

      // Check if NIM/NIP exists
      const existingUser = await mongoService.findOne('users', { email: identifier })
      if (existingUser) {
        return response.status(400).json({ message: 'NIM/NIP sudah terdaftar' })
      }

      const hashedPassword = await hash.make(password)

      const user = await mongoService.insertOne('users', {
        name,
        email: identifier,
        password: hashedPassword,
        role,
        nim: role === 'mahasiswa' ? nimNip : null,
        nip: role === 'dosen' ? nimNip : null,
        latitude: role === 'dosen' ? latitude : null,
        longitude: role === 'dosen' ? longitude : null,
        sessionStart: null,
        sessionEnd: null,
        isSessionActive: false,
      })

      return response.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  async login({ request, response }: HttpContext) {
    try {
      await mongoService.connect()

      const { email, password } = request.only(['email', 'password'])

      // Try to find user by email/NIM/NIP first
      let user = (await mongoService.findOne('users', { email })) as MongoUser | null

      // If not found and input looks like a name (contains space), try finding admin by name
      if (!user && email.includes(' ')) {
        user = (await mongoService.findOne('users', {
          name: email,
          role: 'admin',
        })) as MongoUser | null
      }
      if (!user) {
        return response.status(401).json({ message: 'Invalid credentials' })
      }

      const isValid = await hash.verify(user.password, password)
      if (!isValid) {
        return response.status(401).json({ message: 'Invalid credentials' })
      }

      const token = Buffer.from(`${user.id}:${user.email}`).toString('base64')

      return response.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  async getUsers({ response }: HttpContext) {
    try {
      await mongoService.connect()
      const users = await mongoService.find('users')
      return response.json(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          latitude: u.latitude,
          longitude: u.longitude,
        }))
      )
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  async getDosen({ response }: HttpContext) {
    try {
      await mongoService.connect()
      const dosen = await mongoService.find('users', { role: 'dosen' })
      return response.json(
        dosen.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          latitude: u.latitude,
          longitude: u.longitude,
        }))
      )
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  async createAttendance({ request, response }: HttpContext) {
    try {
      await mongoService.connect()

      const { userId, dosenId, latitude, longitude, photo } = request.only([
        'userId',
        'dosenId',
        'latitude',
        'longitude',
        'photo',
      ])

      const dosen = await mongoService.findOne('users', {
        _id: new ObjectId(dosenId),
        role: 'dosen',
      })

      if (!dosen) {
        return response.status(404).json({ message: 'Dosen not found' })
      }

      if (!dosen.latitude || !dosen.longitude) {
        return response.status(400).json({ message: 'Dosen location not set' })
      }

      // Check if session is active
      const now = new Date()
      const isSessionActive =
        dosen.isSessionActive && dosen.sessionEnd && new Date(dosen.sessionEnd) > now

      if (!isSessionActive) {
        return response.status(400).json({
          message: 'Session absensi tidak aktif atau sudah berakhir',
          sessionEnd: dosen.sessionEnd,
        })
      }

      const distance = this.calculateDistance(
        latitude,
        longitude,
        dosen.latitude!,
        dosen.longitude!
      )

      const maxDistance = 5
      const status = distance <= maxDistance ? 'hadir' : 'terlambat'

      const attendance = await mongoService.insertOne('attendances', {
        userId,
        dosenId,
        latitude,
        longitude,
        distance: Math.round(distance),
        status,
        photo: photo || null,
      })

      return response.status(201).json({
        message: 'Attendance recorded successfully',
        attendance,
        distance: Math.round(distance),
        status,
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  async getAttendances({ response }: HttpContext) {
    try {
      await mongoService.connect()
      const attendances = await mongoService.find('attendances')
      return response.json(attendances)
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  async startAttendanceSession({ request, response }: HttpContext) {
    try {
      await mongoService.connect()

      const { dosenId } = request.only(['dosenId'])

      const dosen = await mongoService.findOne('users', {
        _id: new ObjectId(dosenId),
        role: 'dosen',
      })

      if (!dosen) {
        return response.status(404).json({ message: 'Dosen not found' })
      }

      const now = new Date()
      const sessionEnd = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes

      await mongoService.updateOne(
        'users',
        { _id: new ObjectId(dosenId) },
        {
          sessionStart: now,
          sessionEnd: sessionEnd,
          isSessionActive: true,
        }
      )

      return response.json({
        message: 'Session absensi dimulai',
        sessionStart: now,
        sessionEnd: sessionEnd,
        duration: '15 menit',
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  async checkSessionStatus({ params, response }: HttpContext) {
    try {
      await mongoService.connect()

      const dosen = await mongoService.findOne('users', {
        _id: new ObjectId(params.dosenId),
        role: 'dosen',
      })

      if (!dosen) {
        return response.status(404).json({ message: 'Dosen not found' })
      }

      const now = new Date()
      const isActive = dosen.isSessionActive && dosen.sessionEnd && new Date(dosen.sessionEnd) > now

      return response.json({
        isActive,
        sessionStart: dosen.sessionStart,
        sessionEnd: dosen.sessionEnd,
        timeRemaining: isActive
          ? Math.max(0, Math.floor((new Date(dosen.sessionEnd!).getTime() - now.getTime()) / 1000))
          : 0,
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  async updateUser({ params, request, response }: HttpContext) {
    try {
      await mongoService.connect()

      const user = await mongoService.findOne('users', {
        _id: new ObjectId(params.id),
      })

      if (!user) {
        return response.status(404).json({ message: 'User not found' })
      }

      const { latitude, longitude } = request.only(['latitude', 'longitude'])

      await mongoService.updateOne(
        'users',
        { _id: new ObjectId(params.id) },
        { latitude, longitude }
      )

      return response.json({
        message: 'Koordinat berhasil diupdate',
        user: {
          id: user.id,
          name: user.name,
          latitude,
          longitude,
        },
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  async deleteUser({ params, response }: HttpContext) {
    try {
      await mongoService.connect()

      const user = await mongoService.findOne('users', {
        _id: new ObjectId(params.id),
      })

      if (!user) {
        return response.status(404).json({ message: 'User not found' })
      }

      // Prevent deleting admin
      if (user.role === 'admin') {
        return response.status(403).json({ message: 'Cannot delete admin user' })
      }

      await mongoService.deleteOne('users', { _id: new ObjectId(params.id) })

      return response.json({
        message: `User ${user.name} berhasil dihapus`,
        deletedUser: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  // Debug method - hapus setelah selesai debug
  async debugUsers({ response }: HttpContext) {
    try {
      await mongoService.connect()
      const users = await mongoService.find('users')
      return response.json({
        totalUsers: users.length,
        users: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          hasPassword: !!u.password,
        })),
      })
    } catch (error) {
      return response.status(500).json({ message: 'Database error', error: error.message })
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }
}
