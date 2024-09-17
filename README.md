WebGL Ripples
=====================

By the powers of WebGL, add a layer of water to your HTML elements which will ripple by cursor interaction!


https://github.com/user-attachments/assets/366541ff-7f3b-4430-92a5-b369c50a929b


Important: this plugin requires the WebGL extension `OES_texture_float` (and `OES_texture_float_linear` for a better effect) and works only with same-origin images (see [this link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) for more information on using cross-origin requested images).

Click [here](https://alexfigliolia.github.io) and touch/mouse over the background to see the effect.

## Installation

```bash
yarn add @figliolia/ripples
# or
npm i @figliolia/ripples
```

## Usage

```typescript
import { Ripples } from "@figliolia/ripples";

const DOMElement = document.getElementByID("myElement");

const rips = new Ripples(DOMElement, {
  resolution: 512,
  dropRadius: 10,
  perturbance: 0.02,
});

// when you're all done rips.destroy()
```

Options
-------
Optionally you can tweak the behavior and appearance by initializing it with some different options:

| Name | Type | Default | Description |
|------|------|---------|-------------|
| imageUrl | string | null | The URL of the image to use as the background. If absent the plugin will attempt to use the value of the computed `background-image` CSS property instead. Data-URIs are accepted as well. |
| dropRadius | float | 10 | The size (in pixels) of the drop that results by clicking or moving the mouse over the canvas. |
| perturbance | float | 0.02 | Basically the amount of refraction caused by a ripple. 0 means there is no refraction. |
| resolution | integer | 512 | The width and height of the WebGL texture to render to. The larger this value, the smoother the rendering and the slower the ripples will propagate. This parameter can also accept the string `device` - which will compute the resolution based on the device's capabilities |
| interactive | bool | true | Whether mouse clicks and mouse movement triggers the effect. |
| crossOrigin | string | "" | The crossOrigin attribute to use for the affected image. For more information see [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes).


Methods
-------
The Ripples Interface also has several methods to programmatically add drops, show, hide or remove the effects among other things:

### drop
Call `new Ripples(...args).drop(x, y, radius, strength)` to manually add a drop at the element's relative coordinates (x, y). `radius` controls the drop's size and `strength` the amplitude of the resulting ripple.

### destroy
Call `new Ripples(...args).destroy()` to remove the effect from the element.

### hide / show
Call `new Ripples(...args).hide()` and `new Ripples(...args).show()` to toggle the effect's visibility. Hiding it will also effectively pause the simulation.

### pause / play
Call `new Ripples(...args).pause()` and `new Ripples(...args).play()` to toggle the simulation's state.

### updateSize
The effect resizes automatically when the width or height of the window changes. When the dimensions of the element changes (if not scaling with the window), you'll need to call `new Ripples(...args).updateSize()` to update the size of the effect accordingly.
