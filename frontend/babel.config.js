module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated's Babel plugin is the worklets plugin (do not add both — duplicate error).
    plugins: ['react-native-reanimated/plugin'],
  };
};
