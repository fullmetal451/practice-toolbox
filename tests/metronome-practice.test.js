import assert from 'node:assert/strict';
import test from 'node:test';
import { barPattern, clampBpm, clickSeconds, rampTempo, tapTempo } from '../metronome/practice.js';

test('每小節的拍點依拍號、細分與重音設定排列', () => {
  assert.deepEqual(barPattern('4/4').map(({ level }) => level), ['accent', 'beat', 'beat', 'beat']);
  assert.deepEqual(barPattern('3/4', 1, false).map(({ level }) => level), ['beat', 'beat', 'beat']);
  assert.deepEqual(barPattern('2/4', 3).map(({ beat, level }) => `${beat}${level[0]}`), ['0a', '0s', '0s', '1b', '1s', '1s']);
  assert.equal(barPattern('4/4', 4).length, 16);
});

test('6/8 以八分音符計拍，第 1、4 拍分別是強拍與次強拍，不另外細分', () => {
  const clicks = barPattern('6/8', 4);
  assert.equal(clicks.length, 6);
  assert.deepEqual(clicks.map(({ level }) => level), ['accent', 'beat', 'beat', 'group', 'beat', 'beat']);
  assert.equal(clickSeconds(120, '6/8', 4), 0.5);
});

test('點擊間隔依 BPM 與細分換算', () => {
  assert.equal(clickSeconds(60, '4/4'), 1);
  assert.equal(clickSeconds(120, '4/4', 2), 0.25);
  assert.equal(clickSeconds(90, '3/4', 3), 60 / 90 / 3);
});

test('BPM 限制在 20 至 300 並取整數', () => {
  assert.equal(clampBpm(10), 20);
  assert.equal(clampBpm(999), 300);
  assert.equal(clampBpm(88.6), 89);
  assert.equal(clampBpm(NaN), null);
});

test('自動加速每幾小節加一次，到上限就停', () => {
  const ramp = { start: 80, step: 5, every: 4, ceiling: 92 };
  assert.deepEqual([0, 3, 4, 7, 8, 12, 40].map((bars) => rampTempo(ramp, bars)), [80, 80, 85, 85, 90, 92, 92]);
  assert.equal(rampTempo({ ...ramp, every: 0 }, 20), 80);
  assert.equal(rampTempo({ ...ramp, ceiling: 70 }, 20), 80);
});

test('點按測速取最近幾次的平均間隔，停太久就重新計算', () => {
  let state = tapTempo([], 1000);
  assert.equal(state.bpm, null);
  state = tapTempo(state.taps, 1500);
  assert.equal(state.bpm, 120);
  state = tapTempo(state.taps, 2000);
  assert.equal(state.bpm, 120);
  state = tapTempo(state.taps, 6000);
  assert.deepEqual(state, { taps: [6000], bpm: null });
  let taps = [];
  for (let index = 0; index < 10; index++) taps = tapTempo(taps, index * 600).taps;
  assert.equal(taps.length, 6);
});
