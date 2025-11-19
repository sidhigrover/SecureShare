import 'react-native-get-random-values'
import CryptoJS from 'crypto-js'

function randomBytes (len) {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return arr
}

function bytesToWordArray (u8) {
  const words = []
  for (let i = 0; i < u8.length; i += 4) {
    words.push(((u8[i] << 24) | (u8[i + 1] << 16) | (u8[i + 2] << 8) | (u8[i + 3])) >>> 0)
  }
  return CryptoJS.lib.WordArray.create(words, u8.length)
}

export async function generateKeyIv () {
  const key = randomBytes(32) // 256-bit
  const iv = randomBytes(16)
  const keyB64 = CryptoJS.enc.Base64.stringify(bytesToWordArray(key))
  const ivB64 = CryptoJS.enc.Base64.stringify(bytesToWordArray(iv))
  return { keyB64, ivB64 }
}

export function encryptAesCbc (plaintext, keyB64, ivB64) {
  const key = CryptoJS.enc.Base64.parse(keyB64)
  const iv = CryptoJS.enc.Base64.parse(ivB64)
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64)
}

export function decryptAesCbc (cipherTextB64, keyB64, ivB64) {
  const key = CryptoJS.enc.Base64.parse(keyB64)
  const iv = CryptoJS.enc.Base64.parse(ivB64)
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(cipherTextB64) })
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
  return CryptoJS.enc.Utf8.stringify(decrypted)
}

export function buildShareUrl (base, id, keyB64, ivB64) {
  const fragment = `key=${encodeURIComponent(keyB64)}:${encodeURIComponent(ivB64)}`
  return `${base.replace(/\/$/, '')}/s/${id}#${fragment}`
}

export function parseShareUrl (urlStr) {
  try {
    const u = new URL(urlStr)
    const id = u.pathname.split('/').pop()
    const hash = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash
    const params = new URLSearchParams(hash)
    const [keyB64, ivB64] = (params.get('key') || '').split(':')
    if (!id || !keyB64 || !ivB64) return null
    return { id, keyB64: decodeURIComponent(keyB64), ivB64: decodeURIComponent(ivB64) }
  } catch {
    return null
  }
}
