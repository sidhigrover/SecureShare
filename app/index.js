import 'react-native-url-polyfill/auto'
import 'react-native-gesture-handler'
import React from 'react'
import { registerRootComponent } from 'expo'
import * as Linking from 'expo-linking'
// no global styles needed here; screens handle their own spacing
import theme from './src/theme'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as PaperProvider } from 'react-native-paper'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from './src/screens/HomeScreen'
import CreateScreen from './src/screens/CreateScreen'
import ViewScreen from './src/screens/ViewScreen'
import SavedSecrets from './src/screens/SavedSecrets'

const Stack = createNativeStackNavigator()

export default function App () {
  const linking = {
    prefixes: [
      Linking.createURL('/'),
      // Add web prefixes only in web environment
      ...(typeof window !== 'undefined' && window.location ? [window.location.origin] : [])
    ],
    config: {
      screens: {
        Home: '',
        Create: 'create',
        View: 's/:id'
      }
    }
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer linking={linking}>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.primary,
              contentStyle: { backgroundColor: theme.colors.background }
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Create" component={CreateScreen} />
            <Stack.Screen name="View" component={ViewScreen} />
            <Stack.Screen name="Saved" component={SavedSecrets} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  )
}

// Ensure the component is mounted correctly on native and web
registerRootComponent(App)
