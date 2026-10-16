/**
 * The first file that runs. Gesture Handler must be imported before any other
 * UI code, or swipes and presses misbehave. It then mounts App.tsx.
 */
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
