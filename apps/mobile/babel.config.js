module.exports = function (api) {
  api.cache(true);
  return {
    // jsxImportSource routes JSX through NativeWind so `className` becomes styles.
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
