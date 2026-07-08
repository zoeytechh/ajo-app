// Routes .svg files to react-native-svg-transformer; everything else to Expo/NativeWind's transformer.
const svgTransformer = require('react-native-svg-transformer');
const upstreamTransformer = require('@expo/metro-config/build/babel-transformer');

module.exports = {
  async transform(params) {
    if (params.filename.endsWith('.svg')) {
      return svgTransformer.transform(params);
    }
    return upstreamTransformer.transform(params);
  },
};
