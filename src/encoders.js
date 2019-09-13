// Encode a Float32Array of samples in WAV format.
//
// samples - A Float32Array of sound samples.
// opts    - An object of zero or more of the following options:
//           addHeader  - Boolean indicating whether to encode the WAV header at
//                        the beginning of the output (default: true).
//           streaming  - Boolean indicating whether the WAV file is being
//                        streamed. When true the ChunkSize and Subchunk2Size
//                        fields get set to 0xffffffff since we don't know the
//                        final size of the data.
//           sampleRate - Number indicating the sample rate of the provided
//                        samples.
//           mono       - Boolean indicating wheter the the provided samples
//                        have one or two channels of data.
//
// Returns a Blob of type audio/wav.
export function encodeWAV(samples, {addHeader = true, streaming = false, sampleRate = 16000, mono = true} = {}) {
  const view = new DataView(new ArrayBuffer((addHeader ? 44 : 0) + samples.length * 2));

  // http://soundfile.sapp.org/doc/WaveFormat/

  if (addHeader) {
    // ChunkID
    writeString(view, 0, 'RIFF');
    // ChunkSize
    view.setUint32(4, streaming ? 0xffffffff : 32 + samples.length * 2, true);
    // Format
    writeString(view, 8, 'WAVE');
    // Subchunk1ID
    writeString(view, 12, 'fmt ');
    // Subchunk1Size
    view.setUint32(16, 16, true);
    // AudioFormat
    view.setUint16(20, 1, true);
    // NumChannels
    view.setUint16(22, mono ? 1 : 2, true);
    // SampleRate
    view.setUint32(24, sampleRate, true);
    // ByteRate
    view.setUint32(28, sampleRate * (mono ? 2 : 4), true);
    // BlockAlign
    view.setUint16(32, mono ? 2 : 4, true);
    // BitsPerSample
    view.setUint16(34, 16, true);
    // Subchunk2ID
    writeString(view, 36, 'data');
    // Subchunk2Size
    view.setUint32(40, streaming ? 0xffffffff : samples.length * 2, true);
  }

  // Data
  writePCM(view, addHeader ? 44 : 0, samples);

  return new Blob([view], {type: 'audio/wav'});
}

function writePCM(view, offset, samples) {
  samples.forEach((s, i) => {
    const clamped = Math.max(-1, Math.min(1, s));
    view.setInt16(offset + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
}

function writeString(view, offset, string) {
  string.split('').forEach((c, i) => { view.setUint8(offset + i, c.charCodeAt(0)); });
}
