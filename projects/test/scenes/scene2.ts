// here is where we would import images
import { Image, tween, waitFrames, easeIn, easeOut, CONSTS } from "../../../index";

// Basic tweening of an image object

function* scene() {
  let objs = [];

  objs.push(new Image("projects/test/img/thumbsup.png", -480, 360 - 335.5 / 2, 480, 335.5));

  yield objs;

  yield* tween (objs[0], 180, {x: CONSTS.SCREEN_CENTER_X-480/2}, easeOut);
  yield* waitFrames(60);
  yield* tween (objs[0], 180, {x: CONSTS.SCREEN_WIDTH}, easeIn);
}

export default scene;