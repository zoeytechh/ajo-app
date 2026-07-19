// Must be imported FIRST in _layout.tsx.
// Shows a native Alert with the crash message the moment any JS error occurs —
// no React rendering required, so it works even during module initialization.
import { Alert } from 'react-native';

const utils = (globalThis as any).ErrorUtils;
if (utils) {
  const prev = utils.getGlobalHandler();
  utils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    try {
      Alert.alert(
        'App Crash — send this to developer',
        (error?.message ?? 'Unknown error') + '\n\n' + (error?.stack ?? '').slice(0, 600),
        [{ text: 'OK', onPress: () => prev?.(error, isFatal) }],
      );
    } catch (_) {
      prev?.(error, isFatal);
    }
  });
}
