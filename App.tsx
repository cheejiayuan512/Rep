/**
 * The root component. Provider lets any screen read the small shared store.
 * SafeAreaProvider keeps content out from under the notch and the home indicator.
 */
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store } from './src/state/store';
import { RootNavigator } from './src/navigation/root-navigator';

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
