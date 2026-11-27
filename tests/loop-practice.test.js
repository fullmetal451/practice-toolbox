import assert from 'node:assert/strict';
import test from 'node:test';
import { AUDIO_SPEEDS, newClip, nextSpeed, practiceBpm, trackEnd, validRange, youtubeId } from '../loop/practice.js';

test('接受 YouTube 一般、短網址與 Shorts，拒絕相似網域與無影片的網址', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=M7lc1UVf-VE&t=30s',
    'https://youtu.be/M7lc1UVf-VE?si=example',
    'm.youtube.com/shorts/M7lc1UVf-VE',
  ]) assert.equal(youtubeId(url), 'M7lc1UVf-VE');
  assert.equal(youtubeId('https://youtube.com.example/watch?v=M7lc1UVf-VE'), null);
  assert.equal(youtubeId('https://www.youtube.com/playlist?list=abc'), null);
});

test('A、B 點有序且位於音源有效範圍內', () => {
  const clip = newClip(90);
  assert.equal(validRange(clip, 90), true);
  assert.equal(validRange({ ...clip, a: 90 }, 90), false);
  assert.equal(validRange({ ...clip, b: null }, 90), false);
  assert.equal(validRange(clip, 89.9), false);
});

test('YouTube 起播後修正片長時，片尾 B 點仍然有效', () => {
  assert.equal(trackEnd(275, 275, 274.64), 274.64);
  assert.equal(trackEnd(20, 275, 274.64), 20);
  assert.equal(trackEnd(274.9, 275, 274.64), 274.64);
  assert.equal(trackEnd(274.64, 274.64, 275), 275);
  assert.equal(validRange({ a: 0, b: trackEnd(275, 275, 274.64) }, 274.64), true);
});

test('加速依輪數與來源的倍速上限', () => {
  const clip = { ...newClip(20), speed: 0.75, gap: 2, ramp: 5, ceiling: 1 };
  assert.equal(nextSpeed(clip, clip.speed, 4, [0.75, 1, 1.25]), 0.75);
  const next = nextSpeed(clip, clip.speed, 5, [0.75, 1, 1.25]);
  assert.equal(next, 1);
  assert.equal(nextSpeed(clip, next, 10, [0.75, 1, 1.25]), 1);
  assert.equal(nextSpeed(clip, 0.8, 5, AUDIO_SPEEDS), 0.85);
});

test('BPM 以實際倍速即時換算', () => {
  assert.equal(practiceBpm(120, 0.8), 96);
  assert.equal(practiceBpm(120, 0.75), 90);
  assert.equal(practiceBpm(111, 0.75), 83.3);
  assert.equal(practiceBpm(NaN, 0.8), null);
});

test('音檔的速度以 0.05 倍遞增並含原速', () => {
  assert.equal(AUDIO_SPEEDS[0], 0.25);
  assert.equal(AUDIO_SPEEDS.at(-1), 2);
  assert.ok(AUDIO_SPEEDS.includes(1));
  assert.ok(AUDIO_SPEEDS.slice(1).every((speed, index) => Math.abs(speed - AUDIO_SPEEDS[index] - 0.05) < 1e-9));
});
