export default ({ config }) => ({
  ...config,
  name: 'SecureShare',
  slug: 'secureshare',
  scheme: 'secureshare',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#6750A4'
  },
  ios: { 
    supportsTablet: true,
    bundleIdentifier: 'com.sidharth2829.secureshare',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSAllowsArbitraryLoadsInWebContent: true
      }
      ,
      // Required so iOS permits biometric-protected SecureStore operations
      // (used when calling SecureStore.setItemAsync with { requireAuthentication: true }).
      NSFaceIDUsageDescription: 'Use Face ID or Touch ID to unlock saved secrets securely.'
    }
  },
  android: {
    package: 'com.sidharth2829.secureshare',
    versionCode: 1,
    splash: {
      backgroundColor: '#6750A4',
      resizeMode: 'contain'
    },
    permissions: [
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'ACCESS_WIFI_STATE'
    ],
    usesCleartextTraffic: true,
    networkSecurityConfig: {
      cleartextTrafficPermitted: true
    },
    gradle: {
      kotlinVersion: '2.0.0'
    }
  },
  plugins: [
    'expo-font',
    'expo-asset'
  ],
  newArchEnabled: false,
  extra: {
    API_URL: process.env.API_URL || 'https://secure-share-production-38a5.up.railway.app',
    eas: {
      projectId: '83681651-9252-4edc-a6a2-402c0ebc2947'
    }
  }
})
