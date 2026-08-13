module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    plugins: [["inline-import", { extensions: [".sql"] }]],
    presets: ["babel-preset-expo"],
  };
};
