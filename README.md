# Glowstick LED designer
Created with Fresh.
You can follow the Fresh "Getting Started" guide here: https://fresh.deno.dev/docs/getting-started

This was created specifically for the Lofted Aero Glowstick but can be adapted for any other application.

https://github.com/LoftedAero/GlowStick

Design the patterns manually using the colour picker and select the LED pixel or upload an image. When uploading an image you can select which surfaces to apply the image to.

There is a preview and button to download the profiles.h file 

![Designer Interface](https://github.com/mc71/Glowstick-Web/blob/main/screenshots/Screenshot%202024-10-31%20at%2011.31.54%E2%80%AFPM.png)
![Output](https://github.com/mc71/Glowstick-Web/blob/main/screenshots/Screenshot%202024-10-31%20at%2011.31.46%E2%80%AFPM.png)

**This is very much a proof of concept.**

Todo: Properly match the image dimesnions to the LED arrangement.
provide a way to position the LED surfaces in space correctly.
Add text input and animation
Better handling of the pixel array to avoid overlapping

### Usage

Make sure to install Deno: https://deno.land/manual/getting_started/installation

Then start the project:

```
deno task start
```

This will watch the project directory and restart as necessary.

