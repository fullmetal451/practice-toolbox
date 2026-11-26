import { concertFrequency } from './catalog.js';

let context;
let voices = [];

export async function playNotes(midiNotes, spacing = 0.018) {
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) throw new Error('這個瀏覽器無法播放試聽音。');
  context ??= new AudioContext();
  await context.resume();
  for (const voice of voices) voice.stop();
  const firstTime = context.currentTime + 0.025;
  const volume = 0.38 / Math.sqrt(midiNotes.length);
  voices = midiNotes.map((midi, index) => {
    const time = firstTime + index * spacing;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = concertFrequency(midi);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(volume, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.95);
    oscillator.connect(envelope).connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + 1);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      voices = voices.filter((voice) => voice !== oscillator);
    };
    return oscillator;
  });
}
