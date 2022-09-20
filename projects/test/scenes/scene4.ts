import { Text, Image, tween, waitUntilTime, easeInOut, easeOut, CONSTS, getTextWidth, waitFrames } from "../../../index";

// Complex simultaneous tweening of multiple objects, with tween chaining

function* scene() {
  let objs = [];

  objs.push(new Image("projects/test/assets/thumbsup.png", -480, CONSTS.SCREEN_CENTER_Y - 335.5/2, 480, 335.5));
  objs.push(new Text("This scene is complicated!", CONSTS.SCREEN_CENTER_X, CONSTS.SCREEN_CENTER_Y));
  yield objs;

  yield* waitUntilTime(yield, 16);
  yield tween(objs[0], 180, {x: CONSTS.SCREEN_CENTER_X - 480/2, rotation: Math.PI*2}, easeOut,
        waitFrames(60,
        tween(objs[0], 120, {opacity: 0.1}, easeInOut)));
  yield tween(objs[1], 60, {y: CONSTS.SCREEN_HEIGHT / 4}, easeInOut,
        tween(objs[1], 60, {y: 3 * CONSTS.SCREEN_HEIGHT / 4}, easeInOut));
  yield* waitUntilTime(yield, 24);
}

export default scene;