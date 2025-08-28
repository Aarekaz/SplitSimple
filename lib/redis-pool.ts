import { createClient, type RedisClientType } from "redis"

/**
 * Redis connection pool for better performance and connection management
 */
class RedisPool {
  private static instance: RedisPool
  private client: RedisClientType | null = null
  private isConnecting = false

  private constructor() {}

  public static getInstance(): RedisPool {
    if (!RedisPool.instance) {
      RedisPool.instance = new RedisPool()
    }
    return RedisPool.instance
  }

  private async createClient(): Promise<RedisClientType> {
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL environment variable is not set")
    }

    const client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        connectTimeout: 5000,
      },
      // Connection pool settings
      pingInterval: 30000, // Ping every 30 seconds to keep connection alive
    }) as RedisClientType

    // Error handling
    client.on('error', (err) => {
      console.error('Redis Client Error:', err)
    })

    client.on('connect', () => {
      console.log('Redis Client Connected')
    })

    client.on('reconnecting', () => {
      console.log('Redis Client Reconnecting...')
    })

    client.on('ready', () => {
      console.log('Redis Client Ready')
    })

    return client
  }

  public async getClient(): Promise<RedisClientType> {
    // If client exists and is ready, return it
    if (this.client && this.client.isReady) {
      return this.client
    }

    // If already connecting, wait for connection
    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      if (this.client && this.client.isReady) {
        return this.client
      }
    }

    // Create new connection
    this.isConnecting = true
    try {
      if (this.client && !this.client.isReady) {
        // Clean up existing client if not ready
        try {
          await this.client.disconnect()
        } catch {
          // Ignore disconnect errors
        }
      }

      this.client = await this.createClient()
      await this.client.connect()
      
      return this.client
    } finally {
      this.isConnecting = false
    }
  }

  public async execute<T>(operation: (client: RedisClientType) => Promise<T>): Promise<T> {
    const client = await this.getClient()
    return await operation(client)
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect()
      } catch (error) {
        console.error('Error disconnecting Redis client:', error)
      } finally {
        this.client = null
      }
    }
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient()
      await client.ping()
      return true
    } catch {
      return false
    }
  }
}

// Export singleton instance methods
const redisPool = RedisPool.getInstance()

export const getRedisClient = () => redisPool.getClient()
export const executeRedisOperation = <T>(operation: (client: RedisClientType) => Promise<T>) => 
  redisPool.execute(operation)
export const disconnectRedis = () => redisPool.disconnect()
export const redisHealthCheck = () => redisPool.healthCheck()

export default redisPool