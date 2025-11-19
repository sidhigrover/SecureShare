import Constants from 'expo-constants'
import axios from 'axios'
import { Platform } from 'react-native'

const API_URL = Constants.expoConfig?.extra?.API_URL || Constants.manifest?.extra?.API_URL || 'https://secure-share-production-38a5.up.railway.app'

export const api = axios.create({ 
  baseURL: `${API_URL}/api`, 
  timeout: 45000, // Longer timeout for mobile networks
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
    'User-Agent': Platform.OS === 'ios' ? 'SecureShare-iOS' : 'SecureShare-Android',
    'X-Requested-With': 'XMLHttpRequest',
  },
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Don't reject on 4xx errors
  }
})

// Add request interceptor for mobile network optimization
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching issues on mobile networks
    config.params = { ...config.params, t: Date.now() }
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor with retry logic for mobile networks
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`)
    return response
  },
  async (error) => {
    const config = error.config
    
    // Don't retry if already retried 3 times
    if (!config || config._retry >= 3) {
      console.error('API Error (max retries reached):', error.message)
      return Promise.reject(error)
    }
    
    // Count retries
    config._retry = (config._retry || 0) + 1
    
    // Retry on network errors or timeouts (common on mobile data)
    if (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout') ||
      error.message?.includes('Network Error')
    ) {
      console.log(`Retrying API request (${config._retry}/3): ${config.url}`)
      
      // Wait before retry with exponential backoff
      const delay = Math.pow(2, config._retry) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
      
      return api(config)
    }
    
    console.error('API Error:', error.message)
    return Promise.reject(error)
  }
)
