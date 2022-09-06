import { defaultRenderer } from '../../index';

import scene1 from './scenes/scene1';
import scene2 from './scenes/scene2';
import scene3 from './scenes/scene3';
import scene4 from './scenes/scene4';

export function main(canvas) {
  let scenes = [scene1(), scene2(), scene3(), scene4()];
  let vidLength = 1440;
  let i = defaultRenderer(canvas, scenes, vidLength);
  let audioPath = 'projects/test/audio.ogg';
  return { i, audioPath, shorter: true };
}