import {flatten, interleave, downsample} from './Microphone';

describe('flatten', () => {
  it('flattens the given array of buffers', () => {
    expect(flatten(
      [
        new Float32Array([1,2,3]),
        new Float32Array([4,5]),
        new Float32Array([6,7,8,9]),
        new Float32Array([10])
      ],
      10
    )).toEqual(new Float32Array([
      1,2,3,4,5,6,7,8,9,10
    ]));
  });
});

describe('interleave', () => {
  it('interleaves the two given buffers', () => {
    expect(interleave(
      new Float32Array([1,3,5,7,9,11]),
      new Float32Array([2,4,6,8,10,12])
    )).toEqual(
      new Float32Array([1,2,3,4,5,6,7,8,9,10,11,12])
    );
  });
});

describe('downsample', () => {
  describe('with a desired rate greater than the original rate', () => {
    it('throws an exception', () => {
      expect(() => {
        downsample(new Float32Array(0), 44100, 98000)
      }).toThrow(new Error('desired rate must be less than original rate'));
    });
  });

  describe('with a desired rate equal to the original rate', () => {
    it('returns the original samples and rate', () => {
      const buf = new Float32Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]);
      expect(downsample(buf, 16000, 16000)).toEqual({
        rate: 16000,
        samples: buf
      });
    });
  });

  it('downsamples the given buffer using the closest whole number downsampling factor to the desired rate', () => {
    const buf = new Float32Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]);

    expect(downsample(buf, 44100, 16000)).toEqual({
      rate: 22050,
      samples: new Float32Array([0,2,4,6,8,10,12,14,16])
    });

    expect(downsample(buf, 44100, 8000)).toEqual({
      rate: 8820,
      samples: new Float32Array([0,5,10,15])
    });

    expect(downsample(buf, 48000, 16000)).toEqual({
      rate: 16000,
      samples: new Float32Array([0,3,6,9,12,15])
    });
  });
});
