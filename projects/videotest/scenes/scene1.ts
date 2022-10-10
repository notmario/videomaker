import { Video, tween, waitFrames, CONSTS, easeIn, easeOut, easeInOut, noEase } from "../../../index";

// Basic tweening of a text object

function* scene() {
  let objs = [];

  objs.push(new Video("projects/videotest/assets/video1", CONSTS.SCREEN_WIDTH / 4, -CONSTS.SCREEN_HEIGHT / 2, CONSTS.SCREEN_WIDTH / 2, CONSTS.SCREEN_HEIGHT / 2));

  yield objs;

  yield* tween (objs[0], 180, {y: CONSTS.SCREEN_HEIGHT / 4}, easeOut);
  yield* waitFrames(60);
  yield tween(objs[0], 420, {currentTime: 420}, noEase);
  yield* tween (objs[0], 180, {rotation: Math.PI * 2}, easeInOut);
  yield* waitFrames(60);
  yield* tween (objs[0], 180, {opacity: 0.5}, easeInOut);
  yield* waitFrames(60);
  yield* tween (objs[0], 180, {y: CONSTS.SCREEN_HEIGHT * 5 / 4}, easeIn);
}

export default scene;