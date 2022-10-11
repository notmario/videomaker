# Video maker
Hello!

This is a tool mostly for personal use but if you find it useful that's great.

Basically, it lets you script a video using components and match it to an audio track (kinda bad implementation but oh well)

Yeah. dunno what to put here

## To make a video:

Uhh this documentation is probably gonna suck for a while but oh well.

1. `git clone` and `npm i`. if you can't do that then this is not for you
2. run `npm i -g typescript` to install the typescript compiler
3. before each video build run `tsc`
4. to render the video in `projects/test` run `node --experimental-wasm-threads . test`
5. to render a partial segment, run `node --experimental-wasm-threads . PROJECT START_FRAME END_FRAME`

uhh yeah that's about it. i tried to do jsdoc so that's there if you want

## Converting a video to image sequence:

This is how you import videos.  
To do this you run the command `ffmpeg -i thevideo.mp4 -vf fps=FRAMERATE frame%05d.jpeg` and that will output an image sequence in the correct format. Place that in a folder and you can import the video. 