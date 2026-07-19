// Must be imported FIRST in _layout.tsx.
// Installs the global JS error handler before any other module loads,
// so if any import throws (bad native module init, etc.) the crash is
// written to SecureStore and shown as an Alert on next launch.
import * as SecureStore from 'expo-secure-store';

const utils = (globalThis as any).ErrorUtils;
if (utils) {
  const prev = utils.getGlobalHandler();
  utils.setGlobalHandler(async (error: Error, isFatal?: boolean) => {
    try {
      await SecureStore.setItemAsync(
        'ajo_crash_log',
        JSON.stringify({
          message: (error?.message ?? 'Unknown error').slice(0, 600),
          stack: (error?.stack ?? '').slice(0, 1200),
          time: new Date().toISOString(),
        }),
      );
    } catch (_) {}
    prev?.(error, isFatal);
  });
}
