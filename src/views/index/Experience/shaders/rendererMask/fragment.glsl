uniform sampler2D tDiffuse; // Input texture
uniform float blurRadius; // Blur radius
uniform float darkRadius; // Darkening radius
uniform float darkIntensity; // Darkening intensity

varying vec2 vUv;

void main() {
  // Get current pixel coordinates
  vec2 uv = vUv;
  // Calculate the distance from the current pixel to the screen center
  float dist = distance(uv, vec2(0.5, 0.5));
  // Calculate blur factor; the farther the distance, the greater the blur
  float blur = smoothstep(blurRadius, 1.0, dist);
  // Calculate darkening factor; the farther the distance, the greater the darkening
  float dark = smoothstep(darkRadius, 1.0, dist) * darkIntensity;
  // Get the color of the current pixel from the input texture
  vec4 color = texture2D(tDiffuse, uv);
  // Blend color based on the blur factor
  color = mix(color, vec4(0.0), blur);
  // Blend color based on the darkening factor
  color = mix(color, vec4(0.0), dark);
  // Output the final color
  gl_FragColor = color;
}