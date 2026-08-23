/**
 * Perpustakaan Jendela Ilmu — Native Mobile App
 *
 * Entry point untuk React Native. Register komponen root dengan AppRegistry.
 *
 * Setup:
 * 1. npm install
 * 2. cd ios && pod install
 * 3. npx react-native run-ios  # atau run-android
 */

import { AppRegistry } from "react-native";
import App from "./src/App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
