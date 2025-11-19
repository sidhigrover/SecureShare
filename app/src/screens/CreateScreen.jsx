import React, { useMemo, useState } from 'react'
import { View, ScrollView } from 'react-native'
import { Button, TextInput, Text, SegmentedButtons, HelperText, Card, Divider } from 'react-native-paper'
import * as Clipboard from 'expo-clipboard'
import QRCode from 'react-native-qrcode-svg'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { api } from '../lib/api'
import { generateKeyIv, encryptAesCbc, buildShareUrl } from '../lib/crypto'

const ttlOptions = [
  { value: '600', label: '10 minutes' },
  { value: '3600', label: '1 hour' },
  { value: '86400', label: '1 day' },
  { value: '604800', label: '7 days' }
]

export default function CreateScreen () {
  const [plaintext, setPlaintext] = useState('')
  const [ttl, setTtl] = useState('3600')
  const [shareUrl, setShareUrl] = useState('')
  const [error, setError] = useState('')
  const baseUrl = useMemo(() => {
    // On web, generate links that open in the web app (not the API server)
    if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin
    // On native, keep using the API host; the deep link scheme can be handled separately if desired
    return (Constants.expoConfig?.extra?.API_URL || 'http://localhost:4000').replace('/api', '')
  }, [])

  const onCreate = async () => {
    setError('')
    try {
      if (!plaintext.trim()) { setError('Please enter a secret'); return }
      const { keyB64, ivB64 } = await generateKeyIv()
      const cipherText = encryptAesCbc(plaintext, keyB64, ivB64)
      const resp = await api.post('/secret', { cipherText, iv: ivB64, expiresIn: Number(ttl) })
      const url = buildShareUrl(baseUrl, resp.data.id, keyB64, ivB64)
      setShareUrl(url)
    } catch (e) {
      console.error('Create secret error:', e)
      console.error('Error response:', e.response?.data)
      console.error('Error message:', e.message)
      console.error('API URL being used:', (Constants.expoConfig?.extra?.API_URL || 'http://localhost:4000') + '/api')
      
      let errorMessage = 'Failed to create secret'
      
      if (e.response?.data?.error) {
        errorMessage = e.response.data.error
      } else if (e.code === 'NETWORK_ERROR' || e.message?.includes('Network Error')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.'
      } else if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.'
      } else if (e.message?.includes('ENOTFOUND')) {
        errorMessage = 'Unable to reach server. Please check your internet connection.'
      } else if (e.message) {
        errorMessage = `Network error: ${e.message}`
      }
      setError(errorMessage)
    }
  }

  const copyUrl = async () => {
    await Clipboard.setStringAsync(shareUrl)
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card>
        <Card.Title title="Create Secret" subtitle="Text is encrypted locally with AES‑256" />
        <Card.Content style={{ gap: 12 }}>
          <TextInput label="Secret" value={plaintext} onChangeText={setPlaintext} multiline numberOfLines={6} mode="outlined" />
          <Text variant="titleSmall">Expires In</Text>
          <SegmentedButtons value={ttl} onValueChange={setTtl} buttons={ttlOptions} />
          <HelperText type="info">Link can be viewed only once. Contents never leave your device unencrypted.</HelperText>
          <Button mode="contained" onPress={onCreate}>Generate Link</Button>
          {error ? <HelperText type="error">{error}</HelperText> : null}
        </Card.Content>
      </Card>

      {shareUrl ? (
        <Card>
          <Card.Title title="Share Link" subtitle="Copy or scan the QR" />
          <Card.Content style={{ alignItems: 'center', gap: 12 }}>
            <Text selectable style={{ fontSize: 12, opacity: 0.7, textAlign: 'center' }}>{shareUrl}</Text>
            <Button mode="elevated" onPress={copyUrl}>Copy Link</Button>
            <Divider style={{ width: '100%' }} />
            <QRCode 
              value={shareUrl} 
              size={200}
              backgroundColor="white"
              color="black"
            />
          </Card.Content>
        </Card>
      ) : null}
    </ScrollView>
  )
}
