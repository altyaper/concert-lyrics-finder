export function createScrollStepper() {
  let remainder = 0;

  return {
    advance(surface, distance) {
      const movement = remainder + Math.max(0, distance);
      const wholePixels = Math.floor(movement + 1e-9);
      remainder = Math.max(0, movement - wholePixels);
      if (wholePixels) surface.scrollTop += wholePixels;
      return surface.scrollTop;
    },
    reset() {
      remainder = 0;
    }
  };
}
