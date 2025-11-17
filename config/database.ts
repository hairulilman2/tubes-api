import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'sqlite',
  connections: {
    sqlite: {
      client: 'sqlite3',
      connection: {
        filename: './tmp/db.sqlite3',
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

// MongoDB digunakan langsung melalui mongodb_service.ts
// Lucid ORM tidak mendukung MongoDB secara native

export default dbConfig
