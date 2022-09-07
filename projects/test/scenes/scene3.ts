import { Text, waitUntilTime, CONSTS } from "../../../index";

// Waiting until a certain time in the video (e.g. for sync)

function* scene() {
  let objs = [];

  objs.push(new Text("Waiting until vid is 15s long", CONSTS.SCREEN_CENTER_X, CONSTS.SCREEN_CENTER_Y));
  yield objs;

  yield* waitUntilTime(yield, 15);
}

export default scene;