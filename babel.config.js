module.exports = function (api) {
  api.cache(true);
  return {
    // `reanimated: false` because Reanimated 4 ships its transform through
    // react-native-worklets, which must be the LAST plugin in the list.
    presets: [['babel-preset-expo', { reanimated: false }]],
    plugins: ['react-native-worklets/plugin'],
  };
};
