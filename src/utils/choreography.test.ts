import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, computeScrollSample, evaluateStagePose } from './choreography';

test('computeScrollSample identifies active chapter and smooth transition blend', () => {
  const rects = [
    { top: -900, height: 900 },
    { top: -200, height: 900 },
    { top: 550, height: 900 },
  ];
  const sample = computeScrollSample(rects, 900);
  assert.equal(sample.chapterIndex, 1);
  assert.ok(sample.blend > 0 && sample.blend < 1);
});

test('evaluateStagePose activates radial ring spread in starburst chapter', () => {
  const starburstIdx = CHAPTERS.findIndex((c) => c.id === 'starburst');
  assert.ok(starburstIdx >= 0);
  const pose = evaluateStagePose({ chapterIndex: starburstIdx, blend: 0 }, false);
  assert.equal(pose.chapterId, 'starburst');
  assert.equal(pose.ringSpread, 1);
  assert.equal(pose.medallionBlend, 0);
});

test('evaluateStagePose activates medallion macro in craft chapter', () => {
  const craftIdx = CHAPTERS.findIndex((c) => c.id === 'craft');
  const pose = evaluateStagePose({ chapterIndex: craftIdx, blend: 0 }, false);
  assert.equal(pose.chapterId, 'craft');
  assert.equal(pose.medallionBlend, 1);
});

test('evaluateStagePose centers configurator donut on narrow mobile viewports', () => {
  const cfgIdx = CHAPTERS.findIndex((c) => c.id === 'configurator');
  const desktopPose = evaluateStagePose({ chapterIndex: cfgIdx, blend: 0 }, false);
  const mobilePose = evaluateStagePose({ chapterIndex: cfgIdx, blend: 0 }, true);
  assert.ok(desktopPose.donutX < 0);
  assert.equal(mobilePose.donutX, 0);
});
