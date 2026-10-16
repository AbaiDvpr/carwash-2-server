const DONE_SOUND_SRC = "/mp3/done_paid.mp3";
const QUEUE_SOUND_SRC = "/mp3/queue.mp3";
const KEEP_GAIN = 0.00002;
const PLAY_GAIN = 0.85;

let audioCtx: AudioContext | null = null;
let silentOsc: OscillatorNode | null = null;
let silentGain: GainNode | null = null;
let doneBuffer: AudioBuffer | null = null;
let queueBuffer: AudioBuffer | null = null;
let loadingDone = false;
let loadingQueue = false;
let doneSource: AudioBufferSourceNode | null = null;
let doneGain: GainNode | null = null;
let queueSource: AudioBufferSourceNode | null = null;
let queueGain: GainNode | null = null;
let htmlAudio: HTMLAudioElement | null = null;
let keepAliveTimer: number | null = null;
let unlockInstalled = false;
let armed = false;
let audible = false;
let pending: "queue" | "done" | null = null;
let queueOnEnded: (() => void) | null = null;
let queuePlaying = false;

function Ctor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
}

function getCtx(): AudioContext | null {
  const AC = Ctor();
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => undefined);
  }
  return audioCtx;
}

function startSilentGraph() {
  const ctx = getCtx();
  if (!ctx || silentOsc) return;
  silentGain = ctx.createGain();
  silentGain.gain.value = KEEP_GAIN;
  silentOsc = ctx.createOscillator();
  silentOsc.frequency.value = 40;
  silentOsc.connect(silentGain);
  silentGain.connect(ctx.destination);
  try {
    silentOsc.start();
  } catch {
    silentOsc = null;
    silentGain = null;
  }
}

function stopNode(node: AudioBufferSourceNode | OscillatorNode | null) {
  if (!node) return;
  try {
    node.stop();
  } catch {
    /* already stopped */
  }
  try {
    node.disconnect();
  } catch {
    /* ignore */
  }
}

function stopQueueSource() {
  queuePlaying = false;
  stopNode(queueSource);
  try {
    queueGain?.disconnect();
  } catch {
    /* ignore */
  }
  queueSource = null;
  queueGain = null;
}

function stopDoneSource() {
  stopNode(doneSource);
  try {
    doneGain?.disconnect();
  } catch {
    /* ignore */
  }
  doneSource = null;
  doneGain = null;
}

function stopHtml() {
  if (!htmlAudio) return;
  htmlAudio.onended = null;
  htmlAudio.pause();
  try {
    htmlAudio.currentTime = 0;
  } catch {
    /* ignore */
  }
}

function getHtml(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!htmlAudio) {
    htmlAudio = new Audio();
    htmlAudio.preload = "auto";
    htmlAudio.setAttribute("playsinline", "true");
    htmlAudio.setAttribute("webkit-playsinline", "true");
  }
  return htmlAudio;
}

async function decodeUrl(ctx: AudioContext, src: string): Promise<AudioBuffer> {
  const res = await fetch(src, { cache: "force-cache" });
  const data = await res.arrayBuffer();
  const copy = data.slice(0);
  try {
    return await ctx.decodeAudioData(copy);
  } catch {
    const copy2 = data.slice(0);
    return await new Promise((resolve, reject) => {
      ctx.decodeAudioData(copy2, resolve, reject);
    });
  }
}

function loadBuffers() {
  const ctx = getCtx();
  if (!ctx) return;
  if (!doneBuffer && !loadingDone) {
    loadingDone = true;
    void decodeUrl(ctx, DONE_SOUND_SRC)
      .then((buf) => {
        doneBuffer = buf;
        ensureDoneKeepAlive();
        flushPending();
      })
      .catch(() => undefined)
      .finally(() => {
        loadingDone = false;
      });
  }
  if (!queueBuffer && !loadingQueue) {
    loadingQueue = true;
    void decodeUrl(ctx, QUEUE_SOUND_SRC)
      .then((buf) => {
        queueBuffer = buf;
        flushPending();
      })
      .catch(() => undefined)
      .finally(() => {
        loadingQueue = false;
      });
  }
}

function ensureDoneKeepAlive() {
  const ctx = getCtx();
  if (!ctx || !doneBuffer || audible) return;
  if (doneSource && doneGain) {
    doneGain.gain.value = KEEP_GAIN;
    return;
  }
  const gain = ctx.createGain();
  gain.gain.value = KEEP_GAIN;
  const src = ctx.createBufferSource();
  src.buffer = doneBuffer;
  src.loop = true;
  src.connect(gain);
  gain.connect(ctx.destination);
  try {
    src.start(0);
    doneSource = src;
    doneGain = gain;
  } catch {
    try {
      gain.disconnect();
    } catch {
      /* ignore */
    }
  }
}

function startKeepAlive() {
  if (typeof window === "undefined" || keepAliveTimer != null) return;
  keepAliveTimer = window.setInterval(() => {
    if (!armed) return;
    const ctx = audioCtx;
    if (ctx?.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
    if (!silentOsc) startSilentGraph();
    if (doneBuffer && !audible) ensureDoneKeepAlive();
    flushPending();
  }, 2_000);
}

function installUnlock() {
  if (typeof window === "undefined" || unlockInstalled) return;
  unlockInstalled = true;
  const unlock = () => {
    if (!armed) return;
    const ctx = getCtx();
    if (ctx?.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
    startSilentGraph();
    if (!audible) ensureDoneKeepAlive();
    if (pending) flushPending();
  };
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener("pointerdown", unlock, opts);
  window.addEventListener("touchstart", unlock, opts);
  window.addEventListener("touchend", unlock, opts);
  window.addEventListener("click", unlock, opts);
  window.addEventListener("keydown", unlock);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") unlock();
  });
}

function playHtml(
  src: string,
  loop: boolean,
  onEnded?: () => void,
): boolean {
  const audio = getHtml();
  if (!audio) return false;
  audio.loop = loop;
  audio.muted = false;
  audio.volume = PLAY_GAIN;
  if (audio.src.indexOf(src) === -1) {
    audio.src = src;
  }
  audio.onended = () => {
    queuePlaying = false;
    onEnded?.();
  };
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }
  void audio.play().catch(() => {
    queuePlaying = false;
    onEnded?.();
  });
  return true;
}

function playQueueFromBuffer(onEnded?: () => void): boolean {
  const ctx = getCtx();
  if (!ctx || !queueBuffer) return false;
  if (ctx.state === "suspended") {
    void ctx.resume().then(() => {
      if (audible || ctx.state !== "running") return;
      if (playQueueFromBuffer(onEnded)) pending = null;
    });
    return true;
  }
  stopQueueSource();
  stopHtml();
  const gain = ctx.createGain();
  gain.gain.value = PLAY_GAIN;
  const src = ctx.createBufferSource();
  src.buffer = queueBuffer;
  src.loop = false;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.onended = () => {
    if (queueSource === src) {
      queueSource = null;
      queueGain = null;
      queuePlaying = false;
    }
    onEnded?.();
  };
  try {
    src.start(0);
    queueSource = src;
    queueGain = gain;
    queuePlaying = true;
    return true;
  } catch {
    try {
      gain.disconnect();
    } catch {
      /* ignore */
    }
    return false;
  }
}

function playDoneFromBuffer(): boolean {
  const ctx = getCtx();
  if (!ctx || !doneBuffer) return false;
  if (ctx.state === "suspended") {
    void ctx.resume().then(() => {
      if (ctx.state !== "running") return;
      if (playDoneFromBuffer()) pending = null;
    });
    return true;
  }
  stopQueueSource();
  stopHtml();
  stopDoneSource();
  const gain = ctx.createGain();
  gain.gain.value = PLAY_GAIN;
  const src = ctx.createBufferSource();
  src.buffer = doneBuffer;
  src.loop = true;
  src.connect(gain);
  gain.connect(ctx.destination);
  try {
    src.start(0);
    doneSource = src;
    doneGain = gain;
    audible = true;
    return true;
  } catch {
    try {
      gain.disconnect();
    } catch {
      /* ignore */
    }
    return false;
  }
}

function fallbackHtmlQueue(onEnded?: () => void): boolean {
  queuePlaying = true;
  return playHtml(QUEUE_SOUND_SRC, false, () => {
    queuePlaying = false;
    onEnded?.();
  });
}

function flushPending() {
  if (pending === "done") {
    if (playDoneFromBuffer()) {
      if (doneSource) pending = null;
      return;
    }
    if (!loadingDone && !doneBuffer) {
      pending = null;
      playHtml(DONE_SOUND_SRC, true);
    }
    return;
  }
  if (pending === "queue") {
    if (queuePlaying) return;
    if (playQueueFromBuffer(queueOnEnded ?? undefined)) {
      if (queuePlaying) pending = null;
      return;
    }
    if (!loadingQueue && !queueBuffer) {
      pending = null;
      fallbackHtmlQueue(queueOnEnded ?? undefined);
    }
  }
}

/** Разблокировка с жеста оплаты / тапа. Контекст больше не suspend-им. */
export function armWashDoneSound(): void {
  if (audible) return;
  armed = true;
  installUnlock();
  startSilentGraph();
  loadBuffers();
  startKeepAlive();
  ensureDoneKeepAlive();
}

export function startWashDoneSound(): void {
  armed = true;
  audible = true;
  pending = "done";
  queueOnEnded = null;
  installUnlock();
  startSilentGraph();
  loadBuffers();
  startKeepAlive();
  stopQueueSource();
  if (playDoneFromBuffer()) {
    if (doneSource) pending = null;
    return;
  }
  if (loadingDone || doneBuffer) return;
  pending = null;
  playHtml(DONE_SOUND_SRC, true);
}

export function playQueueBeep(onEnded?: () => void): boolean {
  if (audible) return false;
  armed = true;
  if (queuePlaying) {
    if (onEnded) queueOnEnded = onEnded;
    return true;
  }
  queueOnEnded = onEnded ?? null;
  pending = "queue";
  installUnlock();
  startSilentGraph();
  loadBuffers();
  startKeepAlive();
  if (playQueueFromBuffer(onEnded)) {
    if (queuePlaying) pending = null;
    return true;
  }
  if (loadingQueue || queueBuffer) return true;
  pending = null;
  return fallbackHtmlQueue(onEnded);
}

export function stopQueueBeep(): void {
  if (pending === "queue") pending = null;
  queueOnEnded = null;
  stopQueueSource();
  if (htmlAudio && !audible) stopHtml();
}

export function stopWashDoneSound(): void {
  audible = false;
  pending = null;
  queueOnEnded = null;
  stopQueueSource();
  stopHtml();
  if (doneGain) {
    doneGain.gain.value = KEEP_GAIN;
  }
}
