// Click sounds shared by the metronome and chord-change practice.
export const SOUNDS = {
  accent: { frequency: 1600, gain: 1 },
  group: { frequency: 1250, gain: 0.85 },
  beat: { frequency: 1000, gain: 0.7 },
  sub: { frequency: 750, gain: 0.38 },
};

export function playClick(context, output, level, time) {
  const sound = SOUNDS[level];
  const tone = context.createOscillator();
  const envelope = context.createGain();
  tone.frequency.value = sound.frequency;
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.exponentialRampToValueAtTime(sound.gain, time + 0.002);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
  tone.connect(envelope).connect(output);
  tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
  tone.start(time);
  tone.stop(time + 0.05);
}
