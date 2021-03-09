
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

This is a HomeBridge plugin for the awesome [Pixelblaze](https://www.bhencke.com/pixelblaze) LED Microcontroller.

Though the Pixelblaze is usually used for complex patterns, it can also be used for simple architectural lighting. 
As HomeKit is limited in controls, the plugin exposes basic on/off/brightness and color pickers.

In order to use the color picker in HomeKit, you'll need to create (and "run") a simple pattern on your Pixelblaze:

```
// Make some global variables to store parameters from UI controls.
// These variables are also exported, so they can be read or written via the API, or watched with the var watcher.
export var hue = .77, saturation = 1, value = 1

// Make a color picker UI control.
export function hsvPickerColor(h, s, v) {
  //store the chosen color into global variables
  hue = h
  saturation = s
  value = v
}

export function render(index) {
  hsv(hue, saturation, value)
}
```

This exposes `hue` and `saturation` variables which can be set from the plugin. `value` is a synonym for `brightness`.

To add this plugin to your Homebridge configuration:

```
  "platforms": [
      {
          "name": "Pixelblaze",
          "platform": "Pixelblaze",
          "colorpicker": "<Set the hsvPicker program ID here>"
      }
  ]
```
