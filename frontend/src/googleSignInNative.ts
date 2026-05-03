import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type GoogleSignInPackage = typeof import('@react-native-google-signin/google-signin');

/**
 * Expo Go does not ship RNGoogleSignin. Only require the native module outside Expo Go
 * so the auth screen (including demo quick-sign-in) can load in Expo Go.
 */
export function loadGoogleSignInNative(): GoogleSignInPackage | null {
  if (Platform.OS === 'web') return null;
  if (Constants.appOwnership === 'expo') return null;
  try {
    return require('@react-native-google-signin/google-signin') as GoogleSignInPackage;
  } catch {
    return null;
  }
}
