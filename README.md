# @gkt/microphone

`@gkt/microphone` is a JavaScript library for recording audio via the WebAudio API.

## Installation

```
$ npm install @gkt/microphone
```

## Usage

```javascript
import Microphone from 'microphone';

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

