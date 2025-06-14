import { Buffer } from 'buffer';
import { ReadableStream, WritableStream, TransformStream } from 'web-streams-polyfill';
import 'text-encoding';
import EventEmitter from 'events';
import * as urlLib from 'url';

// Add global polyfills
global.Buffer = Buffer;
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;
global.EventEmitter = EventEmitter;

// URL polyfill
if (!global.URL) {
  global.URL = urlLib.URL;
  global.URLSearchParams = urlLib.URLSearchParams;
}

// Polyfill for process
if (!global.process) {
  global.process = {
    env: {},
    nextTick: (callback: Function, ...args: any[]) => setTimeout(() => callback(...args), 0),
    version: '',
    versions: {},
    platform: 'react-native'
  } as any;
}

// WebSocket polyfill for React Native
if (!global.WebSocket) {
  // React Native already provides a WebSocket implementation
  console.log('WebSocket is already defined in React Native');
}

// Console polyfill is already provided by React Native

// Other polyfills can be added as needed 