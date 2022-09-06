import { createCanvas, Image } from "canvas";

const PROJECT_TO_BUILD = process.argv[2];

const readline = require('readline');

const fs = require('fs');
const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');

const ffmpeg = createFFmpeg({ log: true });

const canvas = createCanvas(1280, 720);

const CONSTS = {
  SCREEN_WIDTH: 1280,
  SCREEN_HEIGHT: 720,
  SCREEN_CENTER_X: 1280 / 2,
  SCREEN_CENTER_Y: 720 / 2,
};

class Text {
  constructor(text: string, x: number, y: number) {
    this.text = text;
    this.x = x;
    this.y = y;
  }
  text = "";
  x = 0;
  y = 0;
  type = "text";
  fontSize = "48px";
  fontFamily = "Arial";
  opacity = 1;
}

class ObjectImage {
  constructor(image: string, x: number, y: number, w: number, h: number) {
    this.image = image;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.realImage = new Image();
    this.realImage.src = __dirname + "/" + image;
    // wait until loaded
    while (this.realImage.width === 0) {}
  }
  image = "";
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  type = "image";
  realImage = null;
  opacity = 1;
}

class Box {
  constructor(color: string, x: number, y: number, w: number, h: number, r: number) {
    this.color = color;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.r = r;
  }
  color = "";
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  r = 0;
  type = "box";
  opacity = 1;
}

/**
 * Tween an object over time. Calling this with yield* will pause the scene until the tween is complete.
 * @param object The object to tween
 * @param duration The duration of the tween in frames
 * @param properties The properties to tween to
 * @param easing The easing function to use (defaults to no easing) 
 */
function* tween (object, duration, properties, easing = noEase) {
  // set object field over duration frames
  let frames = 0;
  let startVals = {};
  for (let prop in properties) {
    startVals[prop] = object[prop];
  }
  while (frames < duration) {
    for (let prop in properties) {
      object[prop] = startVals[prop] + easing(frames / duration) * (properties[prop] - startVals[prop]);
    }
    frames++;
    yield;
  }
}

/**
 * Wait for a number of frames. Calling this with yield* will pause the scene until the wait is complete.
 * @param frames The number of frames to wait
 */
function* waitFrames (frames) {
  while (frames > 0) {
    frames--;
    yield;
  }
}

/**
 * Wait until a certain time has passed. Calling this with yield* will pause the scene until the wait is complete.
 * @param i The current time
 * @param time The time to wait until
 */
function* waitUntilTime (i, time) {
  while (i < time*60) {
    i++;
    yield;
  }
}

/**
 * Pin an object to another object, making it static relative to the base. calling this using yield* will cause an infinite loop!
 * @param pinned The object that moves along with base
 * @param base The object which described the movement of pinned
 */
function* pinTo (pinned, base) {
  // get x and y difference
  let xDiff = pinned.x - base.x;
  let yDiff = pinned.y - base.y;
  while (true) {
    pinned.x = base.x + xDiff;
    pinned.y = base.y + yDiff;
    yield;
  }
}

/**
 * Easing function (in out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeInOut = (t) => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

/**
 * Easing function (in)
 * @param t Easing progress
 * @returns Eased value
 */
const easeIn = (t) => {
  return t * t;
};

/**
 * Easing function (out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeOut = (t) => {
  return t * (2 - t);
};

/**
 * What do you think this does?
 * @param t Easing progress
 * @returns Eased value
 */
const noEase = (t) => {
  return t;
};

/**
 * Helper function to get the width of a text string
  * @param text The text to measure
  * @param font The font to use
 */
const getTextWidth = (text, font) => {
  let context = canvas.getContext("2d");
  context.font = font;
  let metrics = context.measureText(text);
  return metrics.width;
};

const textProgressBar = (v, m, w) => {
  let text = "";
  for (let i = 0; i < w; i++) {
    if (i < w*v/m) {
      text += "█";
    } else {
      text += "░";
    }
  }
  return text;
};


const defaultRenderer = (canvas, scenes, vidLength = null) => {
  let i = 0;
  for (let scene of scenes) {
    let objects = scene.next();
    let result = { done: false, value: objects.value } as IteratorResult<any>;
    let runningTweens = [];

    while (!result.done) {
      result = scene.next(i);

      // check if a generator was yielded
      while (result.value && result.value.next) {
        runningTweens.push(result.value);
        result = scene.next(i);
      }

      // loop through running tweens
      for (let j = 0; j < runningTweens.length; j++) {
        let tween = runningTweens[j];
        let res = tween.next();
        if (res.done) {
          runningTweens.splice(j, 1);
          j--;
        }
      }

      // clear canvas
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      canvas.getContext('2d').fillStyle = "black";
      canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
      
      // draw objects
      for (let obj of objects.value) {
        canvas.getContext('2d').globalAlpha = obj.opacity;
        if (obj.type === "text") {
          canvas.getContext('2d').font = `${obj.fontSize} ${obj.fontFamily}`;
          canvas.getContext('2d').fillStyle = "white";
          canvas.getContext('2d').textAlign = "center";
          canvas.getContext('2d').fillText(obj.text, obj.x, obj.y);
        } else if (obj.type === "image") {
          canvas.getContext('2d').drawImage(obj.realImage, obj.x, obj.y, obj.w, obj.h);
        } else if (obj.type === "box") {
          canvas.getContext('2d').fillStyle = obj.color;
          let r = obj.r;
          if (r > obj.w / 2) r = obj.w / 2;
          if (r > obj.h / 2) r = obj.h / 2;
          canvas.getContext('2d').fillRect(obj.x + r, obj.y, obj.w - 2 * r, obj.h);
          canvas.getContext('2d').fillRect(obj.x, obj.y + r, obj.w, obj.h - 2 * r);
          canvas.getContext('2d').fillRect(obj.x + r, obj.y + r, obj.w - 2 * r, obj.h - 2 * r);
          canvas.getContext('2d').beginPath();
          canvas.getContext('2d').moveTo(obj.x + r, obj.y);
          canvas.getContext('2d').arcTo(obj.x + obj.w, obj.y, obj.x + obj.w, obj.y + obj.h, r);
          canvas.getContext('2d').arcTo(obj.x + obj.w, obj.y + obj.h, obj.x, obj.y + obj.h, r);
          canvas.getContext('2d').arcTo(obj.x, obj.y + obj.h, obj.x, obj.y, r);
          canvas.getContext('2d').arcTo(obj.x, obj.y, obj.x + obj.w, obj.y, r);
          canvas.getContext('2d').fill();
        }
      }
      if (vidLength === null)
        console.log(`rendering frame ${`0000${i}`.slice(-5)} - objects: ${objects.value.length} - tweens running: ${runningTweens.length}`);
      else 
        console.log(`rendering frame ${`0000${i}`.slice(-5)} - ${textProgressBar(i,vidLength,20)} - objects: ${objects.value.length} - tweens running: ${runningTweens.length}`);
      // save frame
      fs.writeFileSync(__dirname + `/out/frame${i}.png`, canvas.toBuffer('image/png'), { flag: 'w' });

      i++;
    }
  }
  return i;
}

// ensure "out" folder exists
if (!fs.existsSync(__dirname + "/out")) {
  fs.mkdirSync(__dirname + "/out");
}

// clear "out" folder
const files = fs.readdirSync(__dirname + "/out");
for (const file of files) {
  fs.unlinkSync(__dirname + "/out/" + file);
}

const project = require(`./projects/${PROJECT_TO_BUILD}/index`);

// run project main method
let props = project.main(canvas);
let length = props.i;
let audioPath = props.audioPath || null;

console.log(audioPath);

(async () => {
  await ffmpeg.load();
  if (audioPath !== null) 
    ffmpeg.FS('writeFile', 'audio.ogg', await fetchFile(__dirname + "/" + audioPath));
  for (let i = 0; i < length; i += 1) {
    const num = `0000${i}`.slice(-5);
    ffmpeg.FS('writeFile', `tmp.${num}.png`, await fetchFile(__dirname + `/out/frame${i}.png`));
  }

  if (audioPath !== null)
    if (props.shorter)
      await ffmpeg.run('-framerate', '60', '-pattern_type', 'glob', '-i', '*.png', '-i', 'audio.ogg', '-c:a', 'mp3', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-shortest', 'out.mp4');
    else
      await ffmpeg.run('-framerate', '60', '-pattern_type', 'glob', '-i', '*.png', '-i', 'audio.ogg', '-c:a', 'mp3', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'out.mp4');
  else
    await ffmpeg.run('-framerate', '60', '-pattern_type', 'glob', '-i', '*.png', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'out.mp4');

  if (audioPath !== null)
    await ffmpeg.FS('unlink', 'audio.ogg');

  for (let i = 0; i < length; i += 1) {
    const num = `0000${i}`.slice(-5);
    await ffmpeg.FS('unlink', `tmp.${num}.png`);
  }
  await fs.promises.writeFile('out.mp4', ffmpeg.FS('readFile', 'out.mp4'));

  // delete frames
  for (let i = 0; i < length; i += 1) {
    await fs.promises.unlink(__dirname + `/out/frame${i}.png`);
  }
  process.exit(0);
})();

export { CONSTS, defaultRenderer, Text, ObjectImage as Image, Box, tween, pinTo, easeInOut, easeIn, easeOut, noEase, waitFrames, waitUntilTime, getTextWidth }