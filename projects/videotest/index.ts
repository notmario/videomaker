import { defaultRenderer } from '../../index';

import scene1 from './scenes/scene1';

export function main(canvas) {
  let scenes = [scene1()];
  let vidLength = 900;
  let i = defaultRenderer(canvas, scenes, vidLength);
  let audioPath = 'projects/test/audio.ogg';
  return { i, audioPath, shorter: true };
}