import {encodeWAV} from './encoders';

function blob2buf(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (event) => {
      resolve(event.target.result);
    }, false);
    reader.readAsArrayBuffer(blob);
  });
}

describe('encodeWAV', () => {
  describe('with defaults', () => {
    it('writes a header with 1 channel and 16kHz sample rate', async () => {
      const samples = new Float32Array(100);
      const wav = encodeWAV(samples);
      const buf = await blob2buf(wav);
      const view = new DataView(buf);

      expect(view.byteLength).toBe(244);

      // ChunkID
      expect(view.getUint8(0)).toBe('R'.charCodeAt(0));
      expect(view.getUint8(1)).toBe('I'.charCodeAt(0));
      expect(view.getUint8(2)).toBe('F'.charCodeAt(0));
      expect(view.getUint8(3)).toBe('F'.charCodeAt(0));

      // ChunkSize
      expect(view.getUint32(4, true)).toBe(232);

      // Format
      expect(view.getUint8(8)).toBe('W'.charCodeAt(0));
      expect(view.getUint8(9)).toBe('A'.charCodeAt(0));
      expect(view.getUint8(10)).toBe('V'.charCodeAt(0));
      expect(view.getUint8(11)).toBe('E'.charCodeAt(0));

      // Subchunk1ID
      expect(view.getUint8(12)).toBe('f'.charCodeAt(0));
      expect(view.getUint8(13)).toBe('m'.charCodeAt(0));
      expect(view.getUint8(14)).toBe('t'.charCodeAt(0));
      expect(view.getUint8(15)).toBe(' '.charCodeAt(0));

      // Subchunk1Size
      expect(view.getUint32(16, true)).toBe(16);

      // AudioFormat
      expect(view.getUint16(20, true)).toBe(1);

      // NumChannels
      expect(view.getUint16(22, true)).toBe(1);

      // SampleRate
      expect(view.getUint16(24, true)).toBe(16000);

      // ByteRate
      expect(view.getUint16(28, true)).toBe(32000);

      // BlockAlign
      expect(view.getUint16(32, true)).toBe(2);

      // BitsPerSample
      expect(view.getUint16(34, true)).toBe(16);

      // Subchunk2ID
      expect(view.getUint8(36)).toBe('d'.charCodeAt(0));
      expect(view.getUint8(37)).toBe('a'.charCodeAt(0));
      expect(view.getUint8(38)).toBe('t'.charCodeAt(0));
      expect(view.getUint8(39)).toBe('a'.charCodeAt(0));

      // Subchunk2Size
      expect(view.getUint32(40, true)).toBe(200);
    });

    it('writes the input data to PCM format', async () => {
      const samples = new Float32Array([-1.5, -0.5, 0, 0.8, 1.2]);
      const wav = encodeWAV(samples);
      const buf = await blob2buf(wav);
      const view = new DataView(buf);
      expect(view.getInt16(44, true)).toBe(-0x8000);
      expect(view.getInt16(46, true)).toBe(Math.floor(-0.5 * 0x8000));
      expect(view.getInt16(48, true)).toBe(0);
      expect(view.getInt16(50, true)).toBe(Math.floor(0.8 * 0x7fff));
      expect(view.getInt16(52, true)).toBe(0x7fff);
    });
  });

  describe('with addHeader false', () => {
    it('does not write a header', async () => {
      const samples = new Float32Array(100);
      const wav = encodeWAV(samples, {addHeader: false});
      const buf = await blob2buf(wav);
      const view = new DataView(buf);
      expect(view.byteLength).toBe(200);
    });
  });

  describe('with streaming true', () => {
    it('sets the chunk size fields to 0xffffffff', async () => {
      const samples = new Float32Array(100);
      const wav = encodeWAV(samples, {streaming: true});
      const buf = await blob2buf(wav);
      const view = new DataView(buf);

      // ChunkSize
      expect(view.getUint32(4, true)).toBe(0xffffffff);

      // Subchunk2Size
      expect(view.getUint32(40, true)).toBe(0xffffffff);
    });
  });

  describe('with another sampleRate', () => {
    it('sets the correct sample rate and byte rate', async () => {
      const samples = new Float32Array(100);
      const wav = encodeWAV(samples, {sampleRate: 8000});
      const buf = await blob2buf(wav);
      const view = new DataView(buf);

      // SampleRate
      expect(view.getUint16(24, true)).toBe(8000);

      // ByteRate
      expect(view.getUint16(28, true)).toBe(16000);
    });
  });

  describe('with mono false', () => {
    it('sets the correct number of channels, byte rate, and block align', async () => {
      const samples = new Float32Array(100);
      const wav = encodeWAV(samples, {mono: false});
      const buf = await blob2buf(wav);
      const view = new DataView(buf);

      // NumChannels
      expect(view.getUint16(22, true)).toBe(2);

      // ByteRate
      expect(view.getUint16(28, true)).toBe(64000);

      // BlockAlign
      expect(view.getUint16(32, true)).toBe(4);
    });
  });
});
