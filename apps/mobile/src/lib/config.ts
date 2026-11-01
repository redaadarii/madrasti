import { Platform } from 'react-native'

/**
 * Adresse de l'API. En production : EXPO_PUBLIC_API_URL (ex. https://ecole.example.ma/api).
 * En développement, le backend local est joignable via localhost depuis le simulateur iOS,
 * et via 10.0.2.2 depuis l'émulateur Android.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8080/api' : 'http://localhost:8080/api')
