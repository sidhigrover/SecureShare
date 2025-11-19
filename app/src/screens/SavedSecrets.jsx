import React, { useEffect, useState } from 'react'
import { View, FlatList, Alert } from 'react-native'
import { Card, Button, Text, Divider } from 'react-native-paper'
import * as SecureStore from 'expo-secure-store'

export default function SavedSecrets ({ navigation }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const loadIndex = async () => {
    setLoading(true)
    try {
      const idxJson = await SecureStore.getItemAsync('secrets_index')
      const idx = idxJson ? JSON.parse(idxJson) : []
      // sort newest first
      idx.sort((a, b) => b.createdAt - a.createdAt)
      setItems(idx)
    } catch (e) {
      console.error('Failed to load secrets_index', e)
      Alert.alert('Error', 'Could not load saved secrets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadIndex)
    loadIndex()
    return unsub
  }, [navigation])

  const openItem = async (key) => {
    try {
      const val = await SecureStore.getItemAsync(key)
      if (val == null) {
        Alert.alert('Not found', 'This secret was not found on this device.')
        await removeKeyFromIndex(key)
        loadIndex()
        return
      }
      // Show content in an Alert for now
      Alert.alert('Saved Secret', val, [{ text: 'OK' }], { cancelable: true })
    } catch (e) {
      console.error('Failed to read secret', e)
      Alert.alert('Error', e.message || 'Failed to read secret')
    }
  }

  const removeKeyFromIndex = async (key) => {
    try {
      const idxJson = await SecureStore.getItemAsync('secrets_index')
      const idx = idxJson ? JSON.parse(idxJson) : []
      const updated = idx.filter(i => i.key !== key)
      await SecureStore.setItemAsync('secrets_index', JSON.stringify(updated))
      setItems(updated)
    } catch (e) {
      console.error('Failed to remove key from index', e)
      Alert.alert('Error', 'Could not remove saved secret')
    }
  }

  const deleteItem = (key) => {
    Alert.alert('Delete', 'Delete this saved secret?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await SecureStore.deleteItemAsync(key)
        } catch (e) {
          console.warn('deleteItemAsync failed', e)
        }
        await removeKeyFromIndex(key)
      } }
    ])
  }

  const renderItem = ({ item }) => (
    <Card style={{ marginBottom: 12 }}>
      <Card.Content>
        <Text>Saved: {new Date(item.createdAt).toLocaleString()}</Text>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => openItem(item.key)}>Open</Button>
        <Divider style={{ flex: 1 }} />
        <Button onPress={() => deleteItem(item.key)} mode="text" compact>Delete</Button>
      </Card.Actions>
    </Card>
  )

  return (
    <View style={{ padding: 16 }}>
      <Text variant="titleMedium" style={{ marginBottom: 12 }}>Saved Secrets</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={loadIndex}
        ListEmptyComponent={<Text>No saved secrets</Text>}
      />
    </View>
  )
}
