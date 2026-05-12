module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // nativewind/babel removed — using className via NativeWind v4 (no plugin needed)
      // react-native-reanimated/plugin removed — causes web build issues without worklets
    ],
  };
};
