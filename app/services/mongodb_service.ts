import { MongoClient, Db, Collection } from 'mongodb'
import env from '#start/env'
import type { MongoUser, MongoAttendance } from '#types/mongodb'

class MongoDBService {
  private client: MongoClient | null = null
  private db: Db | null = null

  async connect(): Promise<void> {
    if (!this.client) {
      const connectionString = env.get('MONGO_CONNECTION_STRING')
      this.client = new MongoClient(connectionString)
      await this.client.connect()
      this.db = this.client.db('attendance_system')
      console.log('✅ Connected to MongoDB Atlas')
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
      console.log('Disconnected from MongoDB')
    }
  }

  getCollection(name: string): Collection {
    if (!this.db) {
      throw new Error('Database not connected')
    }
    return this.db.collection(name)
  }

  async insertOne(collection: string, document: any) {
    const coll = this.getCollection(collection)
    const result = await coll.insertOne({
      ...document,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return { ...document, _id: result.insertedId, id: result.insertedId.toString() }
  }

  async find(collection: string, filter: any = {}): Promise<(MongoUser | MongoAttendance)[]> {
    const coll = this.getCollection(collection)
    const results = await coll.find(filter).toArray()
    return results.map((doc) => ({ ...doc, id: doc._id.toString() })) as any
  }

  async findOne(collection: string, filter: any): Promise<MongoUser | MongoAttendance | null> {
    const coll = this.getCollection(collection)
    const result = await coll.findOne(filter)
    return result ? ({ ...result, id: result._id.toString() } as any) : null
  }

  async updateOne(collection: string, filter: any, update: any) {
    const coll = this.getCollection(collection)
    await coll.updateOne(filter, {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    })
  }

  async deleteOne(collection: string, filter: any) {
    const coll = this.getCollection(collection)
    await coll.deleteOne(filter)
  }
}

export default new MongoDBService()
