import { BaseModel, column } from '@adonisjs/lucid/orm'
// Use Date instead of luxon DateTime to avoid type issues
type DateTime = Date

export default class Attendance extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare dosenId: string

  @column()
  declare latitude: number

  @column()
  declare longitude: number

  @column()
  declare distance: number

  @column()
  declare status: 'hadir' | 'terlambat' | 'tidak_hadir'

  @column()
  declare photo: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
