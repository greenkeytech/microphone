#!/usr/bin/env python
"""
Generates filter coefficients and shows its frequency response

author: Colin Brochtrup
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import signal

input_fs = 44.1e3

# This controls how fast the magnitude response can change and increasing it
# increases computation time
filter_order = 41

# This is the start of frequencies we want to attenuate
f = 9e3
normalized_freq = f/input_fs
coef = signal.firwin(filter_order, f, fs=input_fs)
print('-- Filter Coefficients --')

# Seven digits of accuracy was chosen somewhat arbitrarily
print(',\n'.join(map(lambda x: f'{x:0.7f}', coef)))

# Plot the magnitude response
w, h = signal.freqz(coef, fs=input_fs)
plt.plot(w, 20 * np.log10(abs(h)))
plt.ylabel('Amplitude (dB)')
plt.xlabel('Frequency (Hz)')
plt.savefig('filter_frequency_response.png')
