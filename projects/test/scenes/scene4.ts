// here is where we would import images
import { Text, Image, tween, waitUntilTime, easeInOut, easeOut, CONSTS, getTextWidth } from "../../../index";


function* scene() {
  let objs = [];

  objs.push(new Image("projects/test/img/thumbsup.png", -480, CONSTS.SCREEN_CENTER_Y - 335.5/2, 480, 335.5));
  objs.push(new Text("This scene is complicated!", CONSTS.SCREEN_CENTER_X, CONSTS.SCREEN_CENTER_Y));
  yield objs;

  yield* waitUntilTime(yield, 16);
  yield tween(objs[0], 180, {x: CONSTS.SCREEN_CENTER_X - 480/2}, easeOut);
  yield tween(objs[1], 120, {y: CONSTS.SCREEN_HEIGHT / 4}, easeInOut);
  yield* waitUntilTime(yield, 24);
}

export default scene;