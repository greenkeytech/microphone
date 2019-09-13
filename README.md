# @gkt/microphone

`@gkt/microphone` is a JavaScript library for recording audio via the WebAudio API.

## Installation

```
$ npm install @gkt/microphone
```

## Usage

```javascript
import Microphone from '@gkt/microphone';

navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
  const mic = new Microphone(stream);

  // start recording audio from the microphone
  mic.start();

  // periodically export a Blob containing WAV data of the audio recorded since the last export
  const blob = mic.export();

  // stop recording audio
  mic.stop();
});
```

## Publishing

To publish a new version, update the `version` field in the `package.json` file and run:

```
$ npm publish --access public
```

This will automatically apply a git tag matching the version and push it.
