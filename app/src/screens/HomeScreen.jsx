import React, { useState } from 'react'
import { View } from 'react-native'
import { Button, TextInput, Text, Card } from 'react-native-paper'

export default function HomeScreen ({ navigation }) {
  const [url, setUrl] = useState('')

  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Card>
        <Card.Title title="SecureShare" subtitle="One‑time encrypted secrets" />
        <Card.Content style={{ gap: 12 }}>
          <Button mode="contained" onPress={() => navigation.navigate('Create')}>Create a Secret</Button>
          <Button mode="text" onPress={() => navigation.navigate('Saved')}>Saved Secrets</Button>
        </Card.Content>
      </Card>

      <Card>
        <Card.Title title="Open a link" subtitle="Paste a SecureShare link to view" />
        <Card.Content style={{ gap: 12 }}>
          <TextInput label="Share URL" value={url} onChangeText={setUrl} autoCapitalize='none' autoCorrect={false} />
          <Button mode="elevated" onPress={() => navigation.navigate('View', { url })} disabled={!url}>View Secret</Button>
        </Card.Content>
      </Card>
    </View>
  )
}
