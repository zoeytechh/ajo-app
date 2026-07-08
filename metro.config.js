const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Apply NativeWind first so its babelTransformerPath is set, then chain SVG transformer on top.
// svg-transformer.js routes .svg files to react-native-svg-transformer and
// delegates everything else to the Expo/NativeWind transformer.
const nwConfig = withNativeWind(config, { input: './global.css' })

nwConfig.transformer.babelTransformerPath = require.resolve('./svg-transformer')
nwConfig.resolver.assetExts = nwConfig.resolver.assetExts.filter((ext) => ext !== 'svg')
nwConfig.resolver.sourceExts = [...nwConfig.resolver.sourceExts, 'svg']

module.exports = nwConfig
