import Redis from 'ioredis'

let client

function createMemoryClient () {
  const store = new Map()
  const timers = new Map()
  return {
    // Expose store and timers for debugging
    store,
    timers,
    set (key, value, exFlag, ttlSec) {
      // support set(key, value, 'EX', ttl)
      store.set(key, value)
      if (timers.has(key)) clearTimeout(timers.get(key))
      if (exFlag === 'EX' && typeof ttlSec === 'number') {
        const t = setTimeout(() => { store.delete(key); timers.delete(key) }, ttlSec * 1000)
        timers.set(key, t)
      }
      return Promise.resolve('OK')
    },
    async call (cmd, key) {
      if (cmd === 'GETDEL') {
        const v = store.get(key)
        store.delete(key)
        if (timers.has(key)) { clearTimeout(timers.get(key)); timers.delete(key) }
        return v ?? null
      }
      throw new Error(`Unsupported command in memory client: ${cmd}`)
    },
    // Add keys method for compatibility
    async keys (pattern) {
      if (pattern === 'secret:*') {
        return Array.from(store.keys()).filter(k => k.startsWith('secret:'))
      }
      return Array.from(store.keys())
    },
    async get (key) {
      return store.get(key) || null
    },
    on () {},
  }
}

export async function createClient () {
  if (client) return client
  let url = process.env.REDIS_URL || 'memory://' // Default to memory store
  
  console.log('REDIS_URL from env:', process.env.REDIS_URL)
  console.log('Using Redis URL:', url)
  
  if (url.startsWith('memory://')) {
    client = createMemoryClient()
    console.log('Using in-memory store (development)')
    return client
  }
  client = new Redis(url)
  client.on('error', (e) => console.error('Redis error', e))
  client.on('connect', () => console.log('Redis connected'))
  return client
}

export function getClient () {
  if (!client) throw new Error('Redis client not initialized')
  return client
}
