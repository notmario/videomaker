import { createCanvas, Image } from "canvas";

let PROJECT_TO_BUILD = process.argv[2];

let START_FRAME = process.argv[3] ? parseInt(process.argv[3]) : 0;
let END_FRAME = process.argv[4] ? parseInt(process.argv[4]) : -1;

const READLINE = require('readline');

function clear() {
    READLINE.cursorTo(process.stdout, 0, 0);
    READLINE.clearLine(process.stdout, 0);
    READLINE.clearScreenDown(process.stdout);
}

const fs = require('fs');
const http = require('http');
const url = require('url');
const tsc = require('node-typescript-compiler')
const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');

const ffmpeg = createFFmpeg({ log: true });

const canvas = createCanvas(1280, 720);

const CONSTS = {
  SCREEN_WIDTH: 1280,
  SCREEN_HEIGHT: 720,
  SCREEN_CENTER_X: 1280 / 2,
  SCREEN_CENTER_Y: 720 / 2,
  SCREEN_HALF_X: 1280 / 2,
  SCREEN_HALF_Y: 720 / 2,
  SCREEN_THIRD_X: 1280 / 3,
  SCREEN_THIRD_Y: 720 / 3,
  SCREEN_TWO_THIRDS_X: 1280 / 3 * 2,
  SCREEN_TWO_THIRDS_Y: 720 / 3 * 2,
  SCREEN_QUARTER_X: 1280 / 4,
  SCREEN_QUARTER_Y: 720 / 4,
  SCREEN_THREE_QUARTERS_X: 1280 / 4 * 3,
  SCREEN_THREE_QUARTERS_Y: 720 / 4 * 3,
};

/** Class representing a text object */
class Text {
  /**
   * Create a text object
   * @param {string} text - The text to display
   * @param {number} x - The x position of the text
   * @param {number} y - The y position of the text
   * @param {string} [fontSize=48px] - The font size of the text
   * @param {string} [fontFamily=Arial] - The font family of the text
  */
  constructor(text: string, x: number, y: number, fontSize = "48px", fontFamily = "Arial", color = "white") {
    this.text = text;
    this.x = x;
    this.y = y;
    this.fontFamily = fontFamily;
    this.fontSize = fontSize;
    this.color = color;
  }
  text = "";
  x = 0;
  y = 0;
  rotation = 0;
  type = "text";
  fontSize = "48px";
  fontFamily = "Arial";
  opacity = 1;
  color = "white";
}

/** Class representing an image object */
class ObjectImage {
  /**
   * Create an image object. Will wait until the image is loaded before continuing.
   * @param {string} image - The path to the image
   * @param {number} x - The x position of the image
   * @param {number} y - The y position of the image
   * @param {number} w - The width of the image
   * @param {number} h - The height of the image
  */
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
  rotation = 0;
  type = "image";
  realImage = null;
  opacity = 1;
}
/** Class representing an image object */
class Video {
  /**
   * Create an video object. Will draw sequential frames from the video from the chosen folder.
   * @param {string} video - The path to the video image folder
   * @param {number} x - The x position of the image
   * @param {number} y - The y position of the image
   * @param {number} w - The width of the image
   * @param {number} h - The height of the image
   * @param {number} [extension="jpeg"] - The file extension of the images
  */
  constructor(video: string, x: number, y: number, w: number, h: number, extension = "jpeg") {
    this.video = video;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.extension = extension;
  }
  video = "";
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  rotation = 0;
  type = "video";
  opacity = 1;
  framerate = 60;
  currentTime = 0;
  extension = "jpeg"
}

/** Class representing a solid block of colour */
class Box {
  /**
   * Create a box object
   * @param {string} color - The color of the box
   * @param {number} x - The x position of the box
   * @param {number} y - The y position of the box
   * @param {number} w - The width of the box
   * @param {number} h - The height of the box
   * @param {number} r - The border radius of the box
  */
  constructor(color: string, x: number, y: number, w: number, h: number, r = 0) {
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
 * @param nextGen The generator to call after the tween is complete
 */
function* tween (object: {[key: string]: any}, duration: number, properties: {[key: string]: any}, easing = noEase, nextGen = null) {
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
  for (let prop in properties) {
    object[prop] = properties[prop];
  }
  if (nextGen && nextGen.next)
    yield* nextGen;
}

/**
 * Wait for a number of frames. Calling this with yield* will pause the scene until the wait is complete.
 * @param frames The number of frames to wait
 * @param nextGen The generator to call after the wait is complete
 */
function* waitFrames (frames, nextGen = null) {
  while (frames-- > 0)
    yield;
  if (nextGen && nextGen.next)
    yield* nextGen;
}

/**
 * Wait until a certain time has passed. Calling this with yield* will pause the scene until the wait is complete.
 * @param i The current time
 * @param time The time to wait until
 * @param nextGen The generator to call after the wait is complete
 */
function* waitUntilTime (i, time, nextGen = null) {
  while (i < time*60) {
    i++;
    yield;
  }
  if (nextGen && nextGen.next)
    yield* nextGen;
}

/**
 * Pin an object to another object, making it static relative to the base. calling this using yield* will cause an infinite loop!
 * @param pinned The object that moves along with base
 * @param base The object which described the movement of pinned
 * @param frames The amount of frames to pin for, or -1 for infinite
 * @param nextGen The generator to call after the pin is complete
 */
function* pinTo (pinned, base, frames = -1, nextGen = null) {
  // get x and y difference
  let xDiff = pinned.x - base.x;
  let yDiff = pinned.y - base.y;
  let rotDiff = pinned.rotation - base.rotation;
  let startRot = pinned.rotation;
  let xScaleDiff = pinned.w / base.w;
  let yScaleDiff = pinned.h / base.h;
  let startW = base.w;
  let startH = base.h;
  while (frames != 0) {
    frames--;
    pinned.rotation = base.rotation + rotDiff;
    pinned.x = base.x + (xDiff * (base.w / startW)) * Math.cos(base.rotation - startRot) - (yDiff * (base.h / startH)) * Math.sin(base.rotation - startRot);
    pinned.y = base.y + (yDiff * (base.h / startH)) * Math.cos(base.rotation - startRot) + (xDiff * (base.w / startW)) * Math.sin(base.rotation - startRot);

    pinned.w = base.w * xScaleDiff;
    pinned.h = base.h * yScaleDiff;
    yield;
  }
  if (nextGen && nextGen.next)
    yield* nextGen;
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
 * Easing function (in)
 * @param t Easing progress
 * @returns Eased value
 */
const easeInSquare = (t) => {
  return t * t * t;
};

/**
 * Easing function (out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeOutSquare = (t) => {
  return 1 + (--t) * t * t;
};

/**
 * Easing function (in out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeInOutSquare = (t) => {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
};

/**
 * Easing function (in)
 * @param t Easing progress
 * @returns Eased value
 */
const easeInCircle = (t) => {
  return 1 - Math.sqrt(1 - t * t);
};

/**
 * Easing function (out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeOutCircle = (t) => {
  return Math.sqrt(1 - (--t) * t);
};

/**
 * Easing function (in out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeInOutCircle = (t) => {
  return t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2;
};

/**
 * Easing function (in)
 * @param t Easing progress
 * @returns Eased value
 */
const easeInBounce = (t) => {
  return 1 - easeOutBounce(1 - t);
};

/**
 * Easing function (out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeOutBounce = (t) => {
  if (t < (1 / 2.75)) {
    return 7.5625 * t * t;
  } else if (t < (2 / 2.75)) {
    return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
  } else if (t < (2.5 / 2.75)) {
    return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
  } else {
    return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
  }
};

/**
 * Easing function (in out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeInOutBounce = (t) => {
  return t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2;
};

/**
 * Easing function (in)
 * @param t Easing progress
 * @returns Eased value
 */
const easeInBack = (t) => {
  return 2.70158 * t * t * t - 1.70158 * t * t;
};

/**
 * Easing function (out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeOutBack = (t) => {
  return 1 - easeInBack(1 - t);
};

/**
 * Easing function (in out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeInOutBack = (t) => {
  return t < 0.5 ? (1 - easeInBack(1 - 2 * t)) / 2 : (1 + easeInBack(2 * t - 1)) / 2;
};

/**
 * Easing function (in)
 * @param t Easing progress
 * @returns Eased value
 */
const easeInElastic = (t) => {
  const c4 = (2 * Math.PI) / 3;
  
  return t === 0
    ? 0
    : t === 1
    ? 1
    : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
};

/**
 * Easing function (out)
 * @param t Easing progress
 * @returns Eased value
 */
const easeOutElastic = (t) => {
  return 1 - easeInElastic(1 - t);
};

const easeInOutElastic = (t) => {
  return t < 0.5
    ? (1 - easeInElastic(1 - 2 * t)) / 2
    : (1 + easeInElastic(2 * t - 1)) / 2;
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
 * Move an object around over time. Calling this with yield* will pause the scene until the movement is complete.
 * @param object The object to move
 * @param duration The duration of the movement in frames
 * @param properties The properties to move around
 * @param framesPerMovement The frames until randomising the movement
 * @param nextGen The generator to call after the move is complete
 */
 function* randomMove (object: {[key: string]: any}, duration: number, properties: {[key: string]: [number, number, number]}, framesPerMovement: number, nextGen = null) {
  let frame = 0;
  let randomiseFrames = 0;
  while (frame < duration) {
    frame++;
    randomiseFrames++;
    if (randomiseFrames >= framesPerMovement) {
      randomiseFrames = 0;
      for (const key in properties) {
        const [_, min, max] = properties[key];
        object[key] = Math.random() * (max - min) + min;
      }
    }
    yield;
  }

  // set values to first number
  for (const key in properties) {
    object[key] = properties[key][0];
  }
  if (nextGen && nextGen.next)
    yield* nextGen;
}

const EASINGS = {
  easeIn,
  easeOut,
  easeInOut,
  easeInSquare,
  easeOutSquare,
  easeInOutSquare,
  easeInCircle,
  easeOutCircle,
  easeInOutCircle,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  noEase
}

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
      if (i < w*v/m - 1) {
        text += "???";
      } else {
        text += ["???", "???", "???", "???", "???", "???", "???", "???", " "][8-Math.floor((w*v/m - i) * 8)];
      }
    } else {
      text += " ";
    }
  }
  return text;
};

/**
 * Render a video using a sequence of generator functions
 * @param canvas The canvas to render to
 * @param scenes An array of generator functions
 * @param vidLength The length of the video in frames (optional, used only for progress bar)
 * @returns The video length in frames
 */
const defaultRenderer = (canvas: any, scenes: Generator<any,void,any>[], vidLength = null) => {
  let i = 0;
  for (let scene of scenes) {
    let objects = scene.next();
    let result = { done: false, value: objects.value } as IteratorResult<any>;
    let runningTweens = [];
    let do_frame;

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
      do_frame = true;
      if (START_FRAME && i < START_FRAME) do_frame = false;
      if (END_FRAME && i > END_FRAME && END_FRAME !== -1) do_frame = false;

      // clear canvas
      if (do_frame) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        canvas.getContext('2d').fillStyle = "black";
        canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
        
        // draw objects
        for (let obj of objects.value) {
          canvas.getContext('2d').globalAlpha = obj.opacity;
          if (obj.type === "text") {
            canvas.getContext('2d').font = `${obj.fontSize} ${obj.fontFamily}`;
            canvas.getContext('2d').fillStyle = obj.color;
            canvas.getContext('2d').textAlign = "center";
            // rotation
            canvas.getContext('2d').save();
            canvas.getContext('2d').translate(obj.x, obj.y);
            canvas.getContext('2d').rotate(obj.rotation);
            canvas.getContext('2d').translate(-obj.x, -obj.y);
            canvas.getContext('2d').fillText(obj.text, obj.x, obj.y);
            canvas.getContext('2d').restore();
          } else if (obj.type === "image") {
            // rotation
            if (!(obj.opacity < 1/100 || obj.x > CONSTS.SCREEN_WIDTH || obj.y > CONSTS.SCREEN_HEIGHT || obj.x + obj.w < 0 || obj.y + obj.h < 0)) {
              canvas.getContext('2d').save();
              canvas.getContext('2d').translate(obj.x + Math.abs(obj.w)/2 , obj.y + Math.abs(obj.h)/2);
              canvas.getContext('2d').rotate(obj.rotation);
              canvas.getContext('2d').translate(-(obj.x + Math.abs(obj.w)/2), -(obj.y + Math.abs(obj.h)/2));
              canvas.getContext('2d').translate(obj.x, obj.y);
              if (obj.w < 0) {canvas.getContext('2d').scale(-1, 1);}
              if (obj.h < 0) {canvas.getContext('2d').scale(1, -1);}
              canvas.getContext('2d').translate(-obj.x, -obj.y);
              canvas.getContext('2d').drawImage(obj.realImage, obj.x, obj.y, Math.abs(obj.w), Math.abs(obj.h));
              canvas.getContext('2d').restore();
            }
          } else if (obj.type === "video") {
            // rotation
            if (!(obj.opacity < 1/100 || obj.x > CONSTS.SCREEN_WIDTH || obj.y > CONSTS.SCREEN_HEIGHT || obj.x + obj.w < 0 || obj.y + obj.h < 0)) {
              canvas.getContext('2d').save();
              canvas.getContext('2d').translate(obj.x + Math.abs(obj.w)/2 , obj.y + Math.abs(obj.h)/2);
              canvas.getContext('2d').rotate(obj.rotation);
              canvas.getContext('2d').translate(-(obj.x + Math.abs(obj.w)/2), -(obj.y + Math.abs(obj.h)/2));
              canvas.getContext('2d').translate(obj.x, obj.y);
              if (obj.w < 0) {canvas.getContext('2d').scale(-1, 1);}
              if (obj.h < 0) {canvas.getContext('2d').scale(1, -1);}
              canvas.getContext('2d').translate(-obj.x, -obj.y);
              // load frame
              let frame = new Image();
              let i = Math.floor(obj.currentTime / 60 * obj.framerate) + 1;
              let num = `0000${i}`.slice(-5);
              frame.src = __dirname + "/" + obj.video + "/frame" + num + "." + obj.extension;
              while (frame.width === 0) {}
              canvas.getContext('2d').drawImage(frame, obj.x, obj.y, obj.w, obj.h);
  
              canvas.getContext('2d').restore();
            }
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
          } else if (obj.type === "video") {
            canvas.getContext('2d').drawImage(obj.realVideo, obj.x, obj.y, obj.w, obj.h);
            if (obj.realVideo.playing) {
              obj.realVideo.currentTime += 1/60;
            }
          }
        }
        if (vidLength === null)
          console.log(`???   ${`0000${i}`.slice(-5)} - ???: ${`00${objects.value.length}`.slice(-3)} - ???: ${`0${runningTweens.length}`.slice(-2)}`);
        else 
          console.log(`???   ${`0000${i}`.slice(-5)} - [${textProgressBar(i,vidLength,50)}] - ???: ${`00${objects.value.length}`.slice(-3)} - ???: ${`0${runningTweens.length}`.slice(-2)}`);
        // save frame
        fs.writeFileSync(__dirname + `/out/frame${i}.jpeg`, canvas.toBuffer('image/jpeg', 0.7), { flag: 'w' });
      } else {
        if (vidLength === null)
          console.log(`???   ${`0000${i}`.slice(-5)} - ???: ${`00${objects.value.length}`.slice(-3)} - ???: ${`0${runningTweens.length}`.slice(-2)}`);
        else 
          console.log(`???   ${`0000${i}`.slice(-5)} - [${textProgressBar(i,vidLength,50)}] - ???: ${`00${objects.value.length}`.slice(-3)} - ???: ${`0${runningTweens.length}`.slice(-2)}`);
        
      }

      i++;
    }
    // save last frame as a png
    if (do_frame) {
      fs.writeFileSync(__dirname + `/temp/lastframe.jpeg`, canvas.toBuffer('image/jpeg', 0.7), { flag: 'w' });
      fs.writeFileSync(__dirname + `/temp/scene${scenes.indexOf(scene)+1}.jpeg`, canvas.toBuffer('image/jpeg', 0.7), { flag: 'w' });
    } else {
      // copy defaultscene.jpeg
      fs.copyFileSync(__dirname + `/defaultscene.jpeg`, __dirname + `/temp/lastframe.jpeg`);
      fs.copyFileSync(__dirname + `/defaultscene.jpeg`, __dirname + `/temp/scene${scenes.indexOf(scene)+1}.jpeg`);

    }
  }
  
  return i;
}

// clear temp folder
const tempFiles = fs.readdirSync(__dirname + "/temp");
for (const file of tempFiles) {
  fs.unlinkSync(__dirname + "/temp/" + file);
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

const render = (asdf = null) => {
  const project = require(`./projects/${PROJECT_TO_BUILD}/index`);
  
  // run project main method
  let props = project.main(canvas);
  let length = props.i;
  let audioPath = asdf || props.audioPath || null;
  let type = asdf || props.type || "mp4"; // mp4 or gif
  console.log(type);
  
  console.log(audioPath);
  
  if (type === "none") {} else
  {
    (async () => {
      await ffmpeg.load();
      if (type === "none") {} else
      if (audioPath !== null) 
        ffmpeg.FS('writeFile', 'audio.ogg', await fetchFile(__dirname + "/" + audioPath));
      for (let i = 0; i < length; i += 1) {
        const num = `0000${i}`.slice(-5);
        if ((type === "mp4" || i % 2 === 0) && fs.existsSync(__dirname + `/out/frame${i}.jpeg`))
          ffmpeg.FS('writeFile', `tmp.${num}.jpeg`, await fetchFile(__dirname + `/out/frame${i}.jpeg`));
      }
    
      if (type === "none") {} else
      if (type === "mp4")
        if (audioPath !== null)
          if (props.shorter)
            await ffmpeg.run('-framerate', '60', '-pattern_type', 'glob', '-i', '*.jpeg', '-ss' , `${Math.floor(100*START_FRAME/60)/100}`, '-i', 'audio.ogg', '-c:a', 'mp3', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-shortest', 'out.mp4');
          else
            await ffmpeg.run('-framerate', '60', '-pattern_type', 'glob', '-i', '*.jpeg', '-ss' , `${Math.floor(100*START_FRAME/60)/100}`, '-i', 'audio.ogg', '-c:a', 'mp3', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'out.mp4');
        else
          await ffmpeg.run('-framerate', '60', '-pattern_type', 'glob', '-i', '*.jpeg', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'out.mp4');
      else if (type === "gif")
        await ffmpeg.run('-framerate', '60', '-pattern_type', 'glob', '-i', '*.jpeg', '-vf', 'scale=360:-1', '-loop', '-1', 'out.gif');
      else if (type === "gifloop")
        await ffmpeg.run('-framerate', '60', '-pattern_type', 'glob', '-i', '*.jpeg', '-vf', 'scale=360:-1', '-loop', '0', 'out.gif');
    
      if (type === "none") {} else
      if (audioPath !== null)
        await ffmpeg.FS('unlink', 'audio.ogg');
    
      if (type === "none") {} else
      for (let i = START_FRAME; i < (END_FRAME === -1 ? length : END_FRAME); i += 1) {
        const num = `0000${i}`.slice(-5);
        await ffmpeg.FS('unlink', `tmp.${num}.jpeg`);
      }
      if (type === "none") {} else
      if (type === "mp4")
        await fs.promises.writeFile('out.mp4', ffmpeg.FS('readFile', 'out.mp4'));
      else
        await fs.promises.writeFile('out.gif', ffmpeg.FS('readFile', 'out.gif'));
    
      // delete frames
      if (type === "none") {} else
      for (let i = 0; i < length; i += 1) {
        if (fs.existsSync(__dirname + `/out/frame${i}.jpeg`))
          await fs.promises.unlink(__dirname + `/out/frame${i}.jpeg`);
      }
      console.log("Done!");
    })();
  }
}

const render_frame = async (frame) => {
  // clear out out folder
  let files = fs.readdirSync(__dirname + "/out");
  for (const file of files) {
    fs.unlinkSync(__dirname + "/out/" + file);
  }

  let old_START_FRAME = START_FRAME;
  let old_END_FRAME = END_FRAME;

  START_FRAME = frame;
  END_FRAME = frame;

  render("none");

  START_FRAME = old_START_FRAME;
  END_FRAME = old_END_FRAME;

  // move file to out.png

  files = fs.readdirSync(__dirname + "/out");
  for (const file of files) {
    // copy to out.png
    fs.renameSync(__dirname + '/out/' + file, __dirname + '/out.png')
  }
}

console.log(PROJECT_TO_BUILD);

if (PROJECT_TO_BUILD === "ui") {
  let hostname = 'localhost';
  let port = 44242
  // create web server
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    const pathname = parsedUrl.pathname;
    console.log(pathname);

    if (pathname.indexOf("tscframe") !== -1 && pathname.indexOf("png") !== -1) {
      let hasdone = false;
      
      tsc.compile({
        'project': '.'
      })
      .then(()=>{console.log("deez"); hasdone = true})
      while (!hasdone) {}
      PROJECT_TO_BUILD = pathname.split('frame')[1].split('.png')[0].split(":")[1]
      render_frame(pathname.split('frame')[1].split('.png')[0].split(":")[2]);
      fs.readFile('out.png', (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          res.statusCode = 200;
          res.setHeader('Content-type', 'image/png');
          res.end(data);
        }
      })
    } else if (pathname.indexOf("frame") !== -1 && pathname.indexOf("png") !== -1) {
      PROJECT_TO_BUILD = pathname.split('frame')[1].split('.png')[0].split(":")[1]
      render_frame(pathname.split('frame')[1].split('.png')[0].split(":")[2]);
      fs.readFile('out.png', (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          res.statusCode = 200;
          res.setHeader('Content-type', 'image/png');
          res.end(data);
        }
      })
    } else if (pathname.indexOf('/render') !== -1) {
      PROJECT_TO_BUILD = pathname.split(":")[1]
      render();
    } else {
      fs.readFile('ui.html', (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          res.statusCode = 200;
          res.setHeader('Content-type', 'text/html');
          res.end(data);
        }
      });
    }
  });
  
  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
  
} else {
  render();
}

export { CONSTS, defaultRenderer, Text, ObjectImage as Image, Box, Video, tween, pinTo, easeInOut, easeIn, easeOut, noEase, EASINGS, waitFrames, waitUntilTime, getTextWidth, randomMove }