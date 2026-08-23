/**
 * Mock React Native module for vitest tests.
 * Provides minimal stubs for testing in Node.js environment.
 */

export const Platform = {
  OS: "ios",
  select: (obj: any) => obj.ios,
};

export const Linking = {
  getInitialURL: () => Promise.resolve(null),
  addEventListener: () => ({ remove: () => {} }),
  openURL: () => Promise.resolve(),
};

export const StyleSheet = {
  create: (obj: any) => obj,
  hairlineWidth: 1,
};

export const View = "View";
export const Text = "Text";
export const TouchableOpacity = "TouchableOpacity";
export const ScrollView = "ScrollView";
export const TextInput = "TextInput";
export const Image = "Image";
export const FlatList = "FlatList";
export const ActivityIndicator = "ActivityIndicator";
export const RefreshControl = "RefreshControl";
export const KeyboardAvoidingView = "KeyboardAvoidingView";

export const PermissionsAndroid = {
  PERMISSIONS: { CAMERA: "android.permission.CAMERA" },
  RESULTS: { GRANTED: "granted", DENIED: "denied" },
  request: () => Promise.resolve("granted"),
};

export const StatusBar = "StatusBar";
export const AppRegistry = {
  registerComponent: () => {},
};
