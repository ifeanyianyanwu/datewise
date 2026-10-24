const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// inlineRem: 16 makes 1rem = 16px (NativeWind defaults to 14), so `p-4` is
// 16px on mobile exactly as on web and the 4pt grid matches.
module.exports = withNativeWind(config, { input: "./src/global.css", inlineRem: 16 });
