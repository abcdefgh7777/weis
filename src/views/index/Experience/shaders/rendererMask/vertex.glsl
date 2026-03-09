varying vec2 vUv;

void main() {
  // Pass vertex position to the fragment shader
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  
  vUv = uv;
}