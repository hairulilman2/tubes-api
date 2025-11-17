import { BaseModel, column } from '@adonisjs/lucid/orm'
// Use Date instead of luxon DateTime to avoid type issues
type DateTime = Date

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare role: 'admin' | 'dosen' | 'mahasiswa'

  @column()
  declare nim: string | null

  @column()
  declare nip: string | null

  @column()
  declare latitude: number | null

  @column()
  declare longitude: number | null

  @column()
  declare sessionStart: DateTime | null

  @column()
  declare sessionEnd: DateTime | null

  @column()
  declare isSessionActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
