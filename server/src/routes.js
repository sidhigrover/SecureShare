import express from 'express'
import { z } from 'zod'
import { getClient } from './redis.js'
import { nanoid } from 'nanoid'

export const router = express.Router()

const createSecretSchema = z.object({
  cipherText: z.string().min(1),
  iv: z.string().min(1),
  expiresIn: z.number().int().positive().max(60 * 60 * 24 * 7).optional() // up to 7 days
})

router.post('/secret', async (req, res) => {
  const parsed = createSecretSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }
  const { cipherText, iv } = parsed.data
  const ttl = parsed.data.expiresIn ?? 60 * 60 // default 1h

  const id = nanoid(16)
  const key = `secret:${id}`

  try {
    const redis = getClient()
    console.log('Redis client type:', redis.constructor.name)
    console.log('Setting key:', key, 'with TTL:', ttl)
    
    const result = await redis.set(key, JSON.stringify({ cipherText, iv }), 'EX', ttl)
    console.log('Redis set result:', result)
    
    const expiresAt = Date.now() + ttl * 1000
    res.json({ id, expiresAt })
  } catch (e) {
    console.error('Failed to store secret:', e)
    console.error('Error details:', e.message, e.stack)
    res.status(500).json({ error: 'Internal error', details: e.message })
  }
})

router.get('/secret/:id', async (req, res) => {
  const { id } = req.params
  const key = `secret:${id}`
  try {
    const redis = getClient()
    // GETDEL is supported in Redis 6.2+
    const data = await redis.call('GETDEL', key)
    if (!data) return res.status(404).json({ error: 'Not found or already viewed' })
    const parsed = JSON.parse(data)
    res.json(parsed)
  } catch (e) {
    console.error('Failed to retrieve secret', e)
    res.status(500).json({ error: 'Internal error' })
  }
})

// Debug endpoint to list all secrets (development only)
router.get('/debug/secrets', async (req, res) => {
  try {
    const redis = getClient()
    
    // Get all secret keys
    const keys = await redis.keys('secret:*')
    const secrets = {}
    
    // For in-memory store
    if (redis.store) {
      for (const key of keys) {
        const data = await redis.get(key)
        secrets[key] = {
          data: JSON.parse(data),
          id: key.replace('secret:', ''),
          hasTimer: redis.timers?.has(key) || false
        }
      }
      return res.json({ type: 'memory', secrets, count: keys.length })
    }
    
    // For real Redis
    for (const key of keys) {
      const [data, ttl] = await Promise.all([
        redis.get(key),
        redis.ttl(key)
      ])
      secrets[key] = {
        data: JSON.parse(data),
        id: key.replace('secret:', ''),
        ttlSeconds: ttl
      }
    }
    
    res.json({ type: 'redis', secrets, count: keys.length })
  } catch (e) {
    console.error('Failed to list secrets', e)
    res.status(500).json({ error: 'Internal error' })
  }
})
