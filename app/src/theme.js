import { MD3LightTheme } from 'react-native-paper'

const paperTheme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6750A4', // MD3 Purple
    secondary: '#625B71',
    tertiary: '#7D5260',
    background: '#F7F7FB',
    surface: '#FFFFFF',
    surfaceVariant: '#E7E0EC',
    outline: '#79747E',
  }
}

export default paperTheme
