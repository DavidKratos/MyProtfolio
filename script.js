const cursorGlow = document.querySelector(".cursor-glow");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion) {
  window.addEventListener("pointermove", (event) => {
    cursorGlow.style.transform = `translate(${event.clientX - 210}px, ${event.clientY - 210}px)`;
  });
}

const reveals = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

reveals.forEach((item) => revealObserver.observe(item));

const counters = document.querySelectorAll("[data-count]");
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const element = entry.target;
      const target = Number(element.dataset.count);
      const duration = target > 100 ? 1200 : 900;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(target * eased).toLocaleString("en-IN");

        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
      counterObserver.unobserve(element);
    });
  },
  { threshold: 0.5 }
);

counters.forEach((counter) => counterObserver.observe(counter));

document.querySelectorAll(".magnetic").forEach((item) => {
  if (reduceMotion) return;

  item.addEventListener("pointermove", (event) => {
    const rect = item.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    item.style.transform = `translate(${x * 0.018}px, ${y * 0.018}px)`;
  });

  item.addEventListener("pointerleave", () => {
    item.style.transform = "";
  });
});

const canvas = document.querySelector("#glow-field");
const gl = canvas.getContext("webgl", { antialias: true, alpha: true });

if (gl && !reduceMotion) {
  const vertexShaderSource = `
    attribute vec2 position;
    uniform float pointSize;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
      gl_PointSize = pointSize;
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    uniform vec3 colorA;
    uniform vec3 colorB;
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      float alpha = smoothstep(0.5, 0.0, dist);
      vec3 color = mix(colorA, colorB, gl_PointCoord.y);
      gl_FragColor = vec4(color, alpha * 0.42);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
  gl.linkProgram(program);
  gl.useProgram(program);

  const positionLocation = gl.getAttribLocation(program, "position");
  const pointSizeLocation = gl.getUniformLocation(program, "pointSize");
  const colorALocation = gl.getUniformLocation(program, "colorA");
  const colorBLocation = gl.getUniformLocation(program, "colorB");
  const buffer = gl.createBuffer();
  const particleCount = 96;
  const particles = Array.from({ length: particleCount }, () => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    speed: 0.00018 + Math.random() * 0.00034,
    drift: Math.random() * Math.PI * 2,
  }));

  const positions = new Float32Array(particleCount * 2);

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(pointSizeLocation, Math.max(42, Math.min(96, window.innerWidth / 12)) * ratio);
  };

  resize();
  window.addEventListener("resize", resize);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.uniform3f(colorALocation, 0.37, 0.69, 1.0);
  gl.uniform3f(colorBLocation, 0.72, 0.42, 1.0);

  let lastTime = performance.now();

  const draw = (time) => {
    const delta = time - lastTime;
    lastTime = time;

    particles.forEach((particle, index) => {
      particle.y += particle.speed * delta;
      particle.x += Math.sin(time * 0.0004 + particle.drift) * 0.00042;

      if (particle.y > 1.15) {
        particle.y = -1.15;
        particle.x = Math.random() * 2 - 1;
      }

      positions[index * 2] = particle.x;
      positions[index * 2 + 1] = particle.y;
    });

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, particleCount);
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
}
