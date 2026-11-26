import { AUDIO_SPEEDS } from './practice.js';

const audioContextClass = () => window.AudioContext ?? window.webkitAudioContext;
let context;
let api;

export function delay(milliseconds, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function until(predicate, signal, timeout) {
  const deadline = performance.now() + timeout;
  while (!predicate() && performance.now() < deadline) await delay(40, signal);
  signal.throwIfAborted();
  return predicate();
}

export function unlockCountInAudio() {
  const AudioContext = audioContextClass();
  if (!AudioContext) return;
  try {
    context ??= new AudioContext();
    context.resume().catch(() => {});
  } catch {
    // The visual count remains available when audio output cannot be opened.
  }
}

export async function playCountIn(onBeat, signal) {
  const start = performance.now();
  for (let beat = 1; beat <= 4; beat++) {
    signal.throwIfAborted();
    onBeat(beat);
    if (context?.state === 'running') {
      const beatTime = context.currentTime;
      const tone = context.createOscillator();
      const volume = context.createGain();
      tone.frequency.value = beat === 1 ? 1320 : 980;
      volume.gain.setValueAtTime(0.0001, beatTime);
      volume.gain.exponentialRampToValueAtTime(0.28, beatTime + 0.004);
      volume.gain.exponentialRampToValueAtTime(0.0001, beatTime + 0.055);
      tone.connect(volume).connect(context.destination);
      tone.onended = () => { tone.disconnect(); volume.disconnect(); };
      tone.start(beatTime);
      tone.stop(beatTime + 0.06);
    }
    await delay(Math.max(0, start + beat * 1000 - performance.now()), signal);
  }
}

export function createAudio(host, file) {
  const url = URL.createObjectURL(file);
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'auto';
  audio.setAttribute('aria-label', '本機音檔播放器');
  audio.src = url;
  host.replaceChildren(audio);
  return {
    async ready(signal) {
      await until(() => audio.readyState >= 1 || audio.error, signal, 10_000);
      if (audio.error || !Number.isFinite(audio.duration) || audio.duration <= 0) throw new Error('無法讀取音檔。請確認格式後重試。');
    },
    time: () => audio.currentTime,
    duration: () => audio.duration,
    rates: () => AUDIO_SPEEDS,
    rate: () => audio.playbackRate,
    setRate: (rate) => { audio.playbackRate = rate; },
    active: () => !audio.paused && !audio.ended,
    advancing: () => !audio.paused && !audio.ended && !audio.seeking,
    ended: () => audio.ended,
    play: () => audio.play(),
    pause: () => audio.pause(),
    seek: (time) => { audio.currentTime = time; },
    async prepare(time, signal) {
      audio.pause();
      audio.currentTime = time;
      await until(() => !audio.seeking && audio.readyState >= 2, signal, 1_500);
    },
    destroy() {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
    },
  };
}

function youtubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  api ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      api = undefined;
      reject(new Error('無法連上 YouTube 播放器，請檢查網路後重試。'));
    };
    const timeout = setTimeout(fail, 12_000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      resolve(window.YT);
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return api;
}

const youtubeErrors = {
  5: 'YouTube 無法在目前的瀏覽器播放這部影片。',
  100: '找不到影片，影片可能已移除或設為私人。',
  101: '影片擁有者禁止在其他網站嵌入播放。',
  150: '影片擁有者禁止在其他網站嵌入播放。',
  153: 'YouTube 無法識別來源網站。請從網頁伺服器開啟播放器。',
};

export function createYouTube(host, id, report, interrupted) {
  let player;
  let ready = false;
  let playerError;
  let playRequested = false;
  const state = () => player?.getPlayerState?.();
  const time = () => player?.getCurrentTime?.() ?? 0;
  const duration = () => player?.getDuration?.() ?? 0;
  return {
    async ready(signal) {
      const YT = await youtubeApi();
      signal.throwIfAborted();
      const iframe = document.createElement('iframe');
      const params = new URLSearchParams({ enablejsapi: '1', playsinline: '1', origin: location.origin });
      iframe.src = `https://www.youtube.com/embed/${id}?${params}`;
      iframe.title = 'YouTube 影片播放器';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      host.replaceChildren(iframe);
      player = new YT.Player(iframe, {
        events: {
          onReady: () => { ready = true; },
          onError: ({ data }) => {
            const message = youtubeErrors[data] ?? '這部影片目前無法在嵌入式播放器播放。';
            playerError = new Error(`${message}（YouTube 錯誤 ${data}）`);
            report(playerError.message);
          },
          onAutoplayBlocked: () => { if (playRequested) interrupted(); },
        },
      });
      await until(() => ready || playerError, signal, 12_000);
      if (playerError) throw playerError;
      if (!ready) throw new Error('YouTube 影片載入逾時，請重試。');
    },
    time,
    duration,
    rates: () => player?.getAvailablePlaybackRates?.() ?? [],
    rate: () => player?.getPlaybackRate?.() || 1,
    setRate: (rate) => player?.setPlaybackRate?.(rate),
    active: () => state() === 1 || state() === 3,
    advancing: () => state() === 1,
    ended: () => state() === 0,
    play() {
      playRequested = true;
      player?.playVideo?.();
    },
    pause() {
      playRequested = false;
      player?.pauseVideo?.();
    },
    seek: (position) => player?.seekTo?.(position, true),
    async prepare(position, signal) {
      playRequested = false;
      player.pauseVideo();
      if (position !== 0 || time() > 0.03) {
        player.seekTo(position, true);
        player.pauseVideo();
      }
      await until(() => state() !== 1 && state() !== 3 && Math.abs(time() - position) < 0.3, signal, 700);
    },
    destroy: () => player?.destroy?.(),
  };
}
