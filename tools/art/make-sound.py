"""草むらの環境音（そよ風＋虫の声＋ときどき小鳥）を作る。

    python tools/art/make-sound.py   → assets/audio/meadow.wav

sound.js は前後0.75秒を切り、0.5秒ぶんをクロスフェードしてつなぐので、
長さに余裕をもたせて作る。
"""
import os
import wave
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(os.path.dirname(os.path.dirname(here)), 'assets', 'audio', 'meadow.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)

SR = 22050
SEC = 16
n = SR * SEC
t = np.arange(n) / SR
rng = np.random.default_rng(7)

# そよ風：ノイズをなめらかにして、ゆっくり強弱をつける
noise = rng.standard_normal(n)
kernel = np.ones(60) / 60
wind = np.convolve(noise, kernel, mode='same')
wind *= 0.35 + 0.25 * np.sin(2 * np.pi * t / 7.0) + 0.1 * np.sin(2 * np.pi * t / 2.3)
wind *= 0.5

# 虫の声（コオロギ風の「リリリ」）
crickets = np.zeros(n)
for base, freq in [(0.3, 4300), (1.1, 4700)]:
    start = base
    while start < SEC - 1:
        for k in range(4):
            s = int((start + k * 0.045) * SR)
            length = int(0.03 * SR)
            if s + length >= n:
                break
            tt = np.arange(length) / SR
            env = np.sin(np.pi * np.arange(length) / length)
            crickets[s:s + length] += np.sin(2 * np.pi * freq * tt) * env
        start += 0.62 + rng.uniform(-0.05, 0.05)
crickets *= 0.05

# 小鳥：ときどき「ピチュ」
birds = np.zeros(n)
for start in (2.4, 6.9, 11.3, 13.8):
    for k in range(2):
        s = int((start + k * 0.16) * SR)
        length = int(0.11 * SR)
        tt = np.arange(length) / SR
        f = 3000 + 1800 * (tt / tt[-1])
        phase = 2 * np.pi * np.cumsum(f) / SR
        env = np.sin(np.pi * np.arange(length) / length) ** 2
        birds[s:s + length] += np.sin(phase) * env
birds *= 0.07

mix = wind + crickets + birds
mix /= max(1e-6, np.abs(mix).max()) / 0.5
pcm = (mix * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(out)
