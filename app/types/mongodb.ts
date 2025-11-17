import { ObjectId } from 'mongodb'

export interface MongoUser {
  _id?: ObjectId
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

export interface MongoAttendance {
  _id?: ObjectId
  id?: string
  userId: string
  dosenId: string
  latitude: number
  longitude: number
  distance: number
  status: 'hadir' | 'terlambat' | 'tidak_hadir'
  photo?: string
  createdAt?: Date
  updatedAt?: Date
}
