uniform vec3 uBaseColor;
uniform float uColorStrength;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vColor;

void main()
{
  // Calculate the distance from the fragment to the center
  float distance = length(vUv - vec2(0.5));
  
  // Calculate the color blend strength
  float blendStrength = 1.5 - distance;
  
  // Adjust color brightness
  vec3 blendedColor = vColor * blendStrength * uColorStrength;
  
  // Overlay with a constant base color
  blendedColor += uBaseColor;
  
  // Output the final color
  gl_FragColor = vec4(blendedColor, 1.0);
}