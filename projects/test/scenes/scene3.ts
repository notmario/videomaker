// here is where we would import images
import { Text, waitUntilTime, CONSTS } from "../../../index";


function* scene() {
  let objs = [];

  objs.push(new Text("Waiting until vid is 15s long", CONSTS.SCREEN_CENTER_X, CONSTS.SCREEN_CENTER_Y));
  yield objs;

  yield* waitUntilTime(yield, 15);
}

export default scene;