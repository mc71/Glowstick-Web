# Glowstick LED Designer

A web-based design tool for creating LED patterns specifically for the [Lofted Aero Glowstick](https://github.com/LoftedAero/GlowStick) project. Try it live at https://mc71-glowstick.deno.dev/

## Features

- Interactive LED grid designer for wings and tail surfaces
- Color picker for manual LED coloring
- Image upload capability with:
  - Position, scale, and rotation controls
  - Automatic pixel-to-LED mapping
  - Selective surface application
- Exports directly to C header file format
- Support for 12-bit color format (4 bits each for R,G,B)

## Screenshots

![Designer Interface](https://github.com/mc71/Glowstick-Web/blob/main/screenshots/Screenshot%202024-10-31%20at%2011.31.54%E2%80%AFPM.png)
*The designer interface showing LED grid layout and controls*

![Output](https://github.com/mc71/Glowstick-Web/blob/main/screenshots/Screenshot%202024-10-31%20at%2011.31.46%E2%80%AFPM.png)
*Example of generated C code output*

## Planned Features

- Text input support
- Animation capabilities
- GIF support
- Multi-pattern export
- 3D preview of LED placement

## Development

Created with [Fresh](https://fresh.deno.dev/), a next-gen web framework built for Deno.

### Prerequisites

- [Deno](https://deno.land/manual/getting_started/installation)

### Local Setup

1. Clone the repository
2. Run the development server:
```
deno task start
```

This will watch the project directory and restart as necessary.
