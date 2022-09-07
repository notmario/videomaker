// here is where we would import images
import { Text, tween, waitFrames, CONSTS, easeIn, easeOut } from "../../../index";

// Basic tweening of a text object

function* scene() {
  let objs = [];

  objs.push(new Text("Hello World!", 640, 0));

  yield objs;

  yield* tween (objs[0], 180, {y: CONSTS.SCREEN_CENTER_Y}, easeOut);
  yield* waitFrames(60);
  yield* tween (objs[0], 180, {y: CONSTS.SCREEN_HEIGHT+48}, easeIn);
}

export default scene;