# Xteink Sleep Image Converter

**English** | [日本語](README.ja.md)

A browser tool for making sleep-screen images for the Xteink X3 / X4.
It crops an image, converts it to 4-level grayscale, optionally draws a calendar on top, and saves the result as BMP or XTCH.
Everything runs in the browser and your images are never uploaded. The only network traffic is fetching font files from Google Fonts.

## Features

- **Device and orientation**: X3 (528×792) / X4 (480×800), portrait or landscape
  - In landscape, the image is rotated 90° to match how you hold the device (turned right or turned left) and saved in the device's native portrait pixel order
- **Cropping**: drag to move, scroll or use the slider to zoom, rotate in 90° steps, flip, or show the whole image with a margin color of your choice
- **Tone**: auto levels, brightness, contrast, gamma, sharpen, invert
- **4-level conversion**: Floyd–Steinberg / Atkinson / Stucki / Bayer / none, with adjustable strength and serpentine scanning
- **Output formats**
  - BMP: 8-bit (default) / 4-bit / 2-bit / 24-bit. The palette uses the panel's native gray levels (0, 85, 170, 255)
  - XTCH: an XTC container holding a single page (a 2-bit XTH page)
- **Calendar**
  - Week starting on Sunday or Monday, any month, and Japanese public holidays (including substitute and "sandwiched" holidays)
  - One month, or two consecutive months stacked or side by side (with adjustable spacing). Switching keeps the text size and whether the calendar sits at the top, middle or bottom
  - Fonts: 20 Google Fonts across gothic (sans-serif), mincho (serif), rounded, handwriting/display and Latin styles, system fonts, or your own font file (.ttf / .otf / .woff / .woff2)
  - Heading format (2026年11月, 令和8年11月, NOVEMBER 2026, and more), weekday labels, text sizes, row height
  - Colors for text, Sundays and holidays, Saturdays, adjacent months and grid lines (chosen from the 4 gray levels)
  - Background panel (color, opacity, corner radius), text outline, and text without anti-aliasing
  - Drag the calendar on the preview to position it
- **UI language**: switch between English and Japanese at the top right. English is the default; Japanese is used only when your browser's language preferences rank Japanese above English. A language you pick is remembered
  - Switching changes only the interface text. The calendar's heading and weekday formats stay as you set them (only their defaults follow the language)

## Usage

```bash
npm install
npm run dev
```

Open the URL that Vite prints. To build static files into `dist/` (paths are relative, so you can host it from a subdirectory such as GitHub Pages):

```bash
npm run build
```

Tests and type-checking:

```bash
npm test
npm run typecheck
```

### Putting the image on the device

- **Stock firmware**: there's no fixed file name. Pick the image in the file browser and set it as the sleep image
- **CrossPoint Reader**: it uses `sleep.bmp` at the root of the SD card, or picks a random BMP from the `/sleep` or `/.sleep` folder. Only BMP files are read as regular sleep images, so XTCH won't work there

## File format notes

### BMP

- Uncompressed and stored bottom-up. The 8-bit, 4-bit and 2-bit variants are palettized: indices 0–3 hold black, dark gray, light gray and white, and the remaining entries are filled with black
- CrossPoint shows palettes made only of native gray levels as-is, without dithering them again (`lib/GfxRenderer/Bitmap.cpp`). 24-bit images are re-quantized on the device
- 2-bit BMP is part of the format but few programs support it, so use 8-bit if compatibility matters

### XTCH

Implemented from the [specification](https://gist.github.com/CrazyCoder/b125f26d6987c0620058249f59f1327d) and checked against the `lib/Xtc` code in [CrossPoint Reader](https://github.com/daveallie/crosspoint-reader) and the writer in [EPUB2XTC](https://github.com/Rafal-P-Mazur/EPUB2XTC).

- 56-byte header → 256-byte metadata → 16-byte page index → XTH page (22-byte header + two bit planes)
- The version is written as uint16 `0x0100` (bytes `00 01`), matching the spec and EPUB2XTC. CrossPoint also accepts the byte-swapped order
- XTH pixel values are **0 = white, 1 = dark gray, 2 = light gray, 3 = black**. The two grays are not in brightness order
- Pixels are column-major starting from the rightmost column, with 8 vertical pixels per byte (MSB on top). The first plane holds the high bit and the second plane the low bit
- Each column takes `ceil(height / 8)` bytes. The X3 and X4 heights are both multiples of 8, so this equals the spec's `(width × height + 7) / 8`

The tests (`tests/encode.test.ts`) check that every pixel round-trips through a decoder that reads the files the same way CrossPoint does. **The output hasn't been tested on a real device yet.**

## Why the image processing is TypeScript only

Rust + wasm was considered, but TypeScript alone is enough at this scale.

- **The workload is small**: the output is at most 528×792 ≈ 420k pixels, and dithering is a single pass over them. Measured in Chromium (a 2400×1600 test image to X3 portrait), one full frame — placement, grayscale, tone, dithering and calendar compositing — takes about 12 ms with Floyd–Steinberg, about 15 ms with Stucki, and about 6 ms without dithering. The whole image is redrawn on every frame while dragging
- **The browser does the heavy lifting**: scaling and rotation use Canvas `drawImage`, and text uses Canvas text rendering, both native. Rasterizing Japanese fonts for the calendar inside wasm wouldn't be worth it
- **wasm wouldn't gain much**: it would speed up only the few milliseconds of dithering, at the cost of copying RGBA data back and forth (about 1.7 MB) and a heavier build (wasm-pack, bundler integration, debugging across two languages)
- **It's easy to swap later**: image processing (`src/image/`) and the encoders (`src/encode/`) are pure functions that take and return typed arrays with no DOM dependency, so just that part could be replaced with Rust if needed

Rust / wasm would be worth revisiting if, for example, you want to:

- reuse the same conversion in a CLI or batch tool (converting many images at once)
- add processing that costs much more per pixel, such as error diffusion in a perceptual color space
- downscale sources with tens of megapixels using a high-quality filter (such as Lanczos) instead of relying on Canvas

## Project layout

```
src/
  main.ts            UI wiring and render scheduling
  state.ts           Default settings, persistence (localStorage), calendar placement
  devices.ts         Resolution of each device
  fonts.ts           Font presets and loading
  i18n.ts            UI strings (English and Japanese) and language switching
  ui/bind.ts         Binds inputs to settings through data-bind attributes
  render/source.ts   Placement of the loaded image and progressive downscaling
  render/pipeline.ts Image → 4 levels → calendar compositing → rotation to the device orientation
  image/             Tone adjustment, dithering, rotation (no DOM dependency)
  encode/            BMP and XTCH encoders (no DOM dependency)
  calendar/          Holiday calculation, month grid, calendar drawing
tests/               Vitest tests
```

## Limitations

- Holidays follow the Japanese holiday law as of 2007 and later. The vernal and autumnal equinox days use an approximation (valid for 1980–2099), and future changes to the law aren't tracked
- Image formats the browser can't decode, such as HEIC, can't be opened
- If Google Fonts can't be reached, a system font is used instead ("System sans-serif / serif" work offline)
