import React, { useEffect, useState } from 'react'
import { View, ScrollView } from 'react-native'
import { Button, TextInput, Text, HelperText, Card } from 'react-native-paper'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { Platform, Alert } from 'react-native'
import { api } from '../lib/api'
import { parseShareUrl, decryptAesCbc } from '../lib/crypto'

export default function ViewScreen ({ route }) {
  const [url, setUrl] = useState(route.params?.url || '')
  const [plaintext, setPlaintext] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (route.params?.url) {
      setUrl(route.params.url)
      return
    }
    // If we navigated to /s/:id on web, reconstruct a full share URL using current location hash if present
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      const idFromPath = window.location.pathname.split('/').filter(Boolean).pop()
      const hash = window.location.hash
      if (idFromPath && hash) {
        setUrl(`${window.location.origin}/s/${idFromPath}${hash}`)
      }
    }
  }, [route.params])

  const viewSecret = async () => {
    setError('')
    setPlaintext('')
    const parsed = parseShareUrl(url)
    if (!parsed) { setError('Invalid share URL'); return }
    const { id, keyB64, ivB64 } = parsed

    setLoading(true)
    try {
      const resp = await api.get(`/secret/${id}`)
      const text = decryptAesCbc(resp.data.cipherText, keyB64, ivB64)
      // Optional biometric gate
      const supported = await LocalAuthentication.hasHardwareAsync()
      if (supported) {
        const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Secret' })
        if (!res.success) throw new Error('Authentication failed')
      }
      setPlaintext(text)
    } catch (e) {
      console.error(e)
      setError('Failed to retrieve or decrypt. It may have expired or been viewed already.')
    } finally {
      setLoading(false)
    }
  }

  const saveOffline = async () => {
    try {
      if (!plaintext) {
        Alert.alert('Nothing to save', 'There is no decrypted secret to save offline.')
        return
      }

      // SecureStore keys may only contain alphanumeric characters, '.', '-', and '_'
      // Avoid using ':' which is invalid on some platforms/backends.
      const key = `secret_${Date.now()}`

      await SecureStore.setItemAsync(key, plaintext, { requireAuthentication: true })

      // Update index of saved keys
      try {
        const idxJson = await SecureStore.getItemAsync('secrets_index')
        const idx = idxJson ? JSON.parse(idxJson) : []
        idx.push({ key, createdAt: Date.now() })
        await SecureStore.setItemAsync('secrets_index', JSON.stringify(idx))
      } catch (e) {
        // Non-fatal: index update failed
        console.warn('Failed to update secrets_index', e)
      }

      Alert.alert('Saved', 'Secret saved securely for offline access.')
    } catch (e) {
      console.error(e)
      Alert.alert('Save failed', e.message || 'Failed to save secret offline.')
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card>
        <Card.Title title="View Secret" subtitle="Paste link or open from a SecureShare URL" />
        <Card.Content style={{ gap: 12 }}>
          <TextInput label="Share URL" value={url} onChangeText={setUrl} autoCapitalize='none' mode="outlined" />
          <Button mode="contained" onPress={viewSecret} loading={loading} disabled={!url || loading}>Fetch & Decrypt</Button>
          {error ? <HelperText type="error">{error}</HelperText> : null}
        </Card.Content>
      </Card>

      {plaintext ? (
        <Card>
          <Card.Title title="Decrypted Secret" />
          <Card.Content style={{ gap: 12 }}>
            <TextInput value={plaintext} multiline editable={false} mode="outlined" />
            <Button mode="elevated" onPress={saveOffline}>Save Offline (Secure)</Button>
          </Card.Content>
        </Card>
      ) : null}
    </ScrollView>
  )
}
