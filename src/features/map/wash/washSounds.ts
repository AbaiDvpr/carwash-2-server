/** Короткий аккорд «готово» — без отдельного mp3. */
export function playWashDoneSound(): void {
  if (typeof window === "undefined") return;

  const playFallback = () => {
    const audio = new Audio("/mp3/queue.mp3");
    audio.volume = 0.85;
    void audio.play().catch(() => undefined);
  };

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) {
    playFallback();
    return;
  }

  try {
    const ctx = new AudioCtx();
    void ctx.resume().catch(() => undefined);
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99];

    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + index * 0.11;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.46);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 1200);
  } catch {
    playFallback();
  }
}
