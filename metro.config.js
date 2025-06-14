const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Hermes'i etkinleştir
config.resolver.sourceExts = process.env.RN_SRC_EXT
  ? [...process.env.RN_SRC_EXT.split(','), ...config.resolver.sourceExts]
  : config.resolver.sourceExts;

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Hermes için ek yapılandırma
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    toplevel: false,
    keep_classnames: true,
    keep_fnames: true,
  },
  output: {
    ascii_only: true,
    quote_style: 3,
    wrap_iife: true,
  },
  sourceMap: {
    includeSources: false,
  },
  toplevel: false,
  compress: {
    reduce_funcs: false,
  },
};

// Configure specific module resolutions
config.resolver.extraNodeModules = {
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer/'),
  events: require.resolve('events/'),
  util: require.resolve('util/'),
  crypto: require.resolve('crypto-browserify'),
  http: require.resolve('@tradle/react-native-http'),
  https: require.resolve('https-browserify'),
  os: require.resolve('os-browserify/browser'),
  path: require.resolve('path-browserify'),
  url: require.resolve('url/'),
  net: require.resolve('react-native-tcp-socket'),
  tls: require.resolve('tls-browserify'),
  zlib: require.resolve('browserify-zlib'),
  assert: require.resolve('assert/'),
  'node-forge': require.resolve('node-forge'),
  fs: false
};

// Add specific alias for web-streams-polyfill
config.resolver.alias = {
  ...config.resolver.alias,
  'web-streams-polyfill/ponyfill/es6': require.resolve('web-streams-polyfill')
};

// Add additional configuration for handling ES modules
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = config; 