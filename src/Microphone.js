import {encodeWAV} from './encoders';

const FILTER = [
  0.0006253,
  -0.0009991,
  -0.0016085,
  0.0004661,
  0.0033264,
  0.0017113,
  -0.0047963,
  -0.0066555,
  0.0033279,
  0.0135469,
  0.0043632,
  -0.0185222,
  -0.0201074,
  0.0147855,
  0.0424725,
  0.0070493,
  -0.0664233,
  -0.0653794,
  0.0849329,
  0.3036509,
  0.4084668,
  0.3036509,
  0.0849329,
  -0.0653794,
  -0.0664233,
  0.0070493,
  0.0424725,
  0.0147855,
  -0.0201074,
  -0.0185222,
  0.0043632,
  0.0135469,
  0.0033279,
  -0.0066555,
  -0.0047963,
  0.0017113,
  0.0033264,
  0.0004661,
  -0.0016085,
  -0.0009991,
  0.0006253
];

// A class for recording data from the microphone and exporting it to WAV
// format.
class Microphone {
  // Create a new Microphone instance.
  //
  // stream - A MediaStream object produced by the MediaDevices.getUserMedia()
  //          method with the audio constraint set.
  // opts   - An object of zero or more of the following options:
  //          bufferSize       - A Number indicating the buffer size in units of
  //                             sample frames. This gets passed directly to the
  //                             BaseAudioContext.createScriptProcessor method
  //                             (default 4096).
  //          exportSampleRate - A Number indicating the desired sample rate to
  //                             use in the exported WAV file. The actual sample
  //                             rate may not match this value exactly since the
  //                             downsampling algorithm used is very simple and
  //                             uses a whole number downsampling factor
  //                             (default: 16000).
  //          mono             - A Boolean indicating whether to record mono
  //                             audio (1 channel) or not (2 channels) (default:
  //                             true).
  //          streaming        - A Boolean indicating whether the audio is being
  //                             streamed. When true only the first export will
  //                             include the WAV header and all subsequent
  //                             exports will just contain the raw PCM encoded
  //                             data. When false the WAV header will be added
  //                             to all exports (default: true).
  //          audioContext     - The AudioContext class to use. This is only
  //                             useful for mocking AudioContext in tests
  //                             (default: window.AudioContext).
  //
  // Examples
  //
  //   navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
  //     const mic = new Microphone(stream, { exportSampleRate: 8000, mono: false});
  //   });
  constructor(stream, {
    bufferSize = 4096,
    exportSampleRate = 16000,
    mono = true,
    streaming = true,
    audioContext = window.AudioContext || window.webkitAudioContext
  } = {}) {
    this.stream = stream;
    this.bufferSize = bufferSize;
    this.exportSampleRate = exportSampleRate;
    this.mono = mono;
    this.streaming = streaming;

    try {
      this.context = new audioContext({sampleRate: exportSampleRate});
      this.source = this.context.createMediaStreamSource(this.stream);
    } catch {
      this.context = new audioContext();
      this.source = this.context.createMediaStreamSource(this.stream);
    }

    this.downsample = this.context.sampleRate > this.exportSampleRate;
  }

  // Start recording audio. This will begin buffering audio data from the
  // microphone.
  //
  // Returns the receiver.
  start() {
    const numChannels = this.mono ? 1 : 2;
    this.node = this.context.createScriptProcessor(this.bufferSize, numChannels, numChannels);
    this.source.connect(this.node);
    this.node.connect(this.context.destination);

    this.node.onaudioprocess = (e) => {
      this.c0Bufs.push(e.inputBuffer.getChannelData(0).slice());

      if (!this.mono) {
        this.c1Bufs.push(e.inputBuffer.getChannelData(1).slice());
      }
    };

    this.c0Bufs = [];
    this.c1Bufs = [];
    this.exportedHeader = false;

    return this;
  }

  // Stop recording audio.
  //
  // Returns the receiver.
  stop() {
    this.node.onaudioprocess = null;
    this.node.disconnect();
    this.node = null;

    return this;
  }

  // Exports the currently buffered audio data to WAV format.
  //
  // Returns a Blob of type audio/wav.
  export() {
    if (this.c0Bufs.length === 0) {
      return new Blob([], {type: 'audio/wav'});
    }

    const c0 = flatten(this.c0Bufs);
    const c1 = flatten(this.c1Bufs);

    // combine sample buffers
    let rate, samples;
    if (this.mono) {
      if (this.downsample) {
        const result = downsample(c0, this.context.sampleRate, this.exportSampleRate);
        rate = result.rate;
        samples = result.samples;
      } else {
        rate = this.context.sampleRate;
        samples = c0;
      }
    } else {
      if (this.downsample) {
        const c0Result = (downsample(flatten(this.c0Bufs), this.context.sampleRate, this.exportSampleRate));
        const c1Result = (downsample(flatten(this.c1Bufs), this.context.sampleRate, this.exportSampleRate));
        rate = c0Result.rate;
        samples = interleave(c0Result.samples, c1Result.samples);
      } else {
        rate = this.context.sampleRate;
        samples = interleave(c0, c1);
      }
    }

    // clear the buffers
    if (this.downsample) {
      // if we're downsampling, we need to leave the last chunk of samples so that they can be
      // used for filtering on the next export. Output will have clicking sounds without this
      this.c0Bufs = [c0.slice(c0.length - FILTER.length)];
      this.c1Bufs = [c1.slice(c1.length - FILTER.length)];
    } else {
      this.c0Bufs = [];
      this.c1Bufs = [];
    }

    const blob = encodeWAV(samples, {
      sampleRate: rate,
      mono: this.mono,
      streaming: this.streaming,
      addHeader: this.streaming ? !this.exportedHeader : true,
    });
    this.exportedHeader = true;
    return blob;
  }
}

// Flattens the given list of buffers into a single buffer.
//
// buffers - An Array of Float32Arrays.
//
// Returns a new Float32Array with the contents from all of the given buffers.
export function flatten(buffers) {
  const buf = new Float32Array(buffers.reduce(((sum, b) => sum + b.length), 0));

  for (let offset = 0, i = 0; i < buffers.length; offset += buffers[i].length, i++) {
    buf.set(buffers[i], offset);
  }

  return buf;
}

// Interleaves two buffers into a single Float32Array.
//
// a - A Float32Array
// b - A Float32Array
//
// Returns a Float32Array.
export function interleave(a, b) {
  const buf = new Float32Array(a.length * 2);

  for (let i = 0; i < a.length; i++) {
    buf[i * 2] = a[i];
    buf[i * 2 + 1] = b[i];
  }

  return buf;
}

// Downsamples the given samples buffer from the given original rate to a rate
// as close to the desired rate as you can get without going under by using a
// whole number downsampling factor.
//
// originalSamples - A Float32Array.
// originalRate    - A Number indicating the rate at which the given samples 
//                   were recorded at.
// desiredRate     - A Number indicating the desired rate to downsample to.
//
// Returns an Object with two fields:
//   rate    - A Number indicating the actual rate the original samples were
//             downsampled to.
//   samples - A Float32Array containing the downsampled values.
export function downsample(originalSamples, originalRate, desiredRate) {
  if (desiredRate > originalRate) {
    throw new Error('desired rate must be less than original rate');
  }

  const filtered = lowpassFilter(originalSamples);
  const factor = Math.floor(originalRate / desiredRate);
  const samples = new Float32Array(Math.round(filtered.length / factor));

  for (let i = 0, j = 0; i < samples.length; i++, j += factor) {
    samples[i] = filtered[j];
  }

  return {rate: originalRate / factor, samples};
}

function lowpassFilter(samples) {
  const length = Math.max(0, samples.length - FILTER.length + 1);
  const buf = new Float32Array(length);

  // convolve the lowpass FIR filter with the signal. We don't reverse the signal because the filter
  // is symmetric. If the filter becomes non symettric this code will need to be adjusted.
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < FILTER.length; j++) {
      buf[i] += samples[i+j] * FILTER[j];
    }
  }

  return buf;
}

export default Microphone;
