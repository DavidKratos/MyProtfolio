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

const assistantForm = document.querySelector("#assistant-form");
const assistantInput = document.querySelector("#assistant-input");
const assistantMessages = document.querySelector("#assistant-messages");
const assistantEmpty = document.querySelector("#assistant-empty");
const assistantStatus = document.querySelector("#assistant-status");
const assistantNew = document.querySelector("#assistant-new");
const assistantFile = document.querySelector("#assistant-file");
const assistantAttach = document.querySelector("#assistant-attach");
const assistantFiles = document.querySelector("#assistant-files");
let assistantAttachments = [];
let previousResponseId = null;
let assistantBusy = false;
let readingAttachments = false;

const refreshIcons = () => window.lucide?.createIcons();
const assistantIcon = (name) => {
  const icon = document.createElement("i");
  icon.dataset.lucide = name;
  icon.setAttribute("aria-hidden", "true");
  return icon;
};
const updateComposer = () => {
  assistantForm.querySelector(".assistant-submit").disabled = assistantBusy || readingAttachments || (!assistantInput.value.trim() && !assistantAttachments.length);
  assistantAttach.disabled = assistantBusy || readingAttachments;
  assistantNew.disabled = assistantBusy || readingAttachments;
  assistantInput.style.height = "auto";
  assistantInput.style.height = `${Math.min(180, assistantInput.scrollHeight)}px`;
};

const profileContext = `
David Raj Ramakrishnan is a Senior / Lead Immersive Architect in Bengaluru.
He works across Unity, XR, VR, AR, MR, WebGL, Azure, REST APIs, analytics, OpenAI-assisted workflows, Generative AI, Agentic AI concepts, and retail intelligence.
Featured work includes SpeedShelf Lite, Shelf Intelligence, ImageMagick-based shelf image stitching architecture, and planogram visualization systems.
Experience: Capgemini from 2023 to present as Immersive Developer - Senior Consultant; Osmo by Byju's from 2020 to 2023 as Game Engineer - 2; Tech Mahindra from 2016 to 2020 as Jr. Software Engineer.
Platforms include Quest, Android, iOS, Windows, WebGL, Oculus Rift, HTC Vive, and ARCore.
Recognition includes a Customer Delight Award for Jan 2025 - June 2025.
Contact: itsmedavidraj@gmail.com, LinkedIn at linkedin.com/in/david-raj-ramakrishnan-47001696/.
`;

const readAssistantFile = (file) =>
  new Promise((resolve, reject) => {
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        name: file.name,
        mimeType: file.type || "text/plain",
        kind: isImage ? "image" : "text",
        content: String(reader.result || ""),
      });
    };

    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));

    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });

const renderAssistantFiles = () => {
  if (!assistantFiles) return;

  assistantFiles.innerHTML = "";
  assistantAttachments.forEach((file, index) => {
    const chip = document.createElement("div");
    chip.className = "assistant-file-chip";

    const label = document.createElement("span");
    label.textContent = file.name;
    if (file.kind === "image") {
      const preview = document.createElement("img");
      preview.src = file.content;
      preview.alt = "";
      chip.append(preview);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.append(assistantIcon("x"));
    remove.addEventListener("click", () => {
      assistantAttachments = assistantAttachments.filter((_, fileIndex) => fileIndex !== index);
      renderAssistantFiles();
      updateComposer();
    });

    chip.append(label, remove);
    assistantFiles.append(chip);
  });
  refreshIcons();
};

const copyButton = (text, label = "Copy response") => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "assistant-copy-btn";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.append(assistantIcon("copy"));
  const caption = document.createElement("span");
  caption.textContent = label === "Copy code" ? "Copy code" : "Copy";
  button.append(caption);
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      caption.textContent = "Copied";
      setTimeout(() => { caption.textContent = label === "Copy code" ? "Copy code" : "Copy"; }, 2000);
    } catch {
      caption.textContent = "Copy unavailable";
    }
  });
  return button;
};

// Render Markdown through a tag/attribute allowlist before inserting it in the page.
const renderAssistantAnswer = (container, answer) => {
  container.replaceChildren();
  if (!window.marked) {
    container.textContent = answer;
  } else {
    const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const renderer = new window.marked.Renderer();
    renderer.html = ({ text }) => escape(text);
    renderer.image = ({ text }) => escape(text || "Image");
    const html = window.marked.parse(answer, { renderer, async: false });
    const documentCopy = new DOMParser().parseFromString(html, "text/html");
    const allowed = new Set(["P", "BR", "STRONG", "EM", "DEL", "CODE", "PRE", "UL", "OL", "LI", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6", "HR", "A", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"]);
    documentCopy.body.querySelectorAll("*").forEach((element) => {
      if (!allowed.has(element.tagName)) {
        element.replaceWith(documentCopy.createTextNode(element.textContent));
        return;
      }
      const href = element.getAttribute("href");
      const language = element.tagName === "CODE" ? element.className.replace(/^language-/, "") : "";
      Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
      if (element.tagName === "A" && href && /^(https?:\/\/|mailto:)/i.test(href)) {
        element.setAttribute("href", href);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
      if (language) element.dataset.language = language;
    });
    container.append(...Array.from(documentCopy.body.childNodes));
    container.querySelectorAll("pre").forEach((pre) => {
      const wrapper = document.createElement("div");
      wrapper.className = "assistant-code";
      const header = document.createElement("div");
      header.className = "assistant-code-header";
      const language = document.createElement("span");
      language.textContent = pre.querySelector("code")?.dataset.language || "code";
      header.append(language, copyButton(pre.textContent, "Copy code"));
      pre.replaceWith(wrapper);
      wrapper.append(header, pre);
    });
    container.querySelectorAll("table").forEach((table) => {
      const wrapper = document.createElement("div");
      wrapper.className = "assistant-table";
      table.replaceWith(wrapper);
      wrapper.append(table);
    });
  }
  container.append(copyButton(answer));
  refreshIcons();
};

const appendAssistantMessage = (role, text, files = []) => {
  assistantEmpty.hidden = true;
  const row = document.createElement("div");
  row.className = `assistant-message assistant-message-${role}`;
  if (role === "assistant") {
    const avatar = document.createElement("span");
    avatar.className = "assistant-avatar";
    avatar.setAttribute("aria-label", "Assistant");
    avatar.append(assistantIcon("sparkles"));
    row.append(avatar);
  }
  const content = document.createElement("div");
  content.className = "assistant-message-content";
  content.textContent = text;
  if (files.length) {
    const previews = document.createElement("div");
    previews.className = "assistant-message-files";
    files.forEach((file) => {
      const preview = document.createElement(file.kind === "image" ? "img" : "span");
      if (file.kind === "image") { preview.src = file.content; preview.alt = file.name; }
      else preview.textContent = file.name;
      previews.append(preview);
    });
    content.append(previews);
  }
  row.append(content);
  assistantMessages.append(row);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
  refreshIcons();
  return { row, content };
};

if (assistantForm && assistantInput && assistantMessages) {
  assistantAttach?.addEventListener("click", () => assistantFile?.click());
  assistantInput.addEventListener("input", updateComposer);
  assistantInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing && window.matchMedia("(pointer: fine)").matches) {
      event.preventDefault();
      if (!assistantBusy && !readingAttachments) assistantForm.requestSubmit();
    }
  });
  assistantNew.addEventListener("click", () => {
    assistantMessages.querySelectorAll(".assistant-message").forEach((row) => row.remove());
    assistantEmpty.hidden = false;
    previousResponseId = null;
    assistantAttachments = [];
    assistantInput.value = "";
    assistantStatus.textContent = "";
    renderAssistantFiles();
    updateComposer();
    assistantInput.focus({ preventScroll: true });
  });
  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      assistantInput.value = button.dataset.prompt;
      updateComposer();
      assistantForm.requestSubmit();
    });
  });

  assistantFile?.addEventListener("change", async () => {
    const selectedFiles = Array.from(assistantFile.files || []);
    if (!selectedFiles.length) return;

    const allowedFiles = selectedFiles.slice(0, Math.max(0, 4 - assistantAttachments.length));
    readingAttachments = true;
    updateComposer();
    assistantStatus.textContent = "Adding attachments...";

    try {
      const loadedFiles = [];
      for (const file of allowedFiles) {
        const isImage = /^image\/(png|jpeg|webp|gif)$/.test(file.type);
        const isScript = /\.(cs|js|ts|tsx|jsx|json|txt|shader|hlsl|cginc|html|css)$/i.test(file.name);
        const totalImageSize = [...assistantAttachments, ...loadedFiles].filter((item) => item.kind === "image").reduce((total, item) => total + item.content.length, 0);
        const isTooLarge = isImage ? totalImageSize + file.size * 1.34 > 3 * 1024 * 1024 : file.size > 240 * 1024;

        if (isTooLarge || (!isImage && !isScript)) {
          assistantStatus.textContent = `${file.name} skipped: use supported images up to 2 MB total or scripts up to 240 KB.`;
          continue;
        }

        loadedFiles.push(await readAssistantFile(file));
      }

      assistantAttachments = [...assistantAttachments, ...loadedFiles].slice(0, 4);
      renderAssistantFiles();
      if (assistantStatus.textContent === "Adding attachments...") assistantStatus.textContent = selectedFiles.length > allowedFiles.length ? "Maximum 4 attachments." : "";
    } catch (error) {
      assistantStatus.textContent = "Could not read that attachment.";
    } finally {
      readingAttachments = false;
      updateComposer();
      assistantFile.value = "";
    }
  });

  assistantForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (assistantBusy || readingAttachments) return;

    const question = assistantInput.value.trim();
    if (!question && !assistantAttachments.length) return;

    const files = assistantAttachments;
    appendAssistantMessage("user", question, files);
    assistantAttachments = [];
    assistantInput.value = "";
    renderAssistantFiles();
    assistantBusy = true;
    updateComposer();
    assistantStatus.textContent = "Thinking...";
    const pending = appendAssistantMessage("assistant", "Thinking...");
    pending.row.classList.add("assistant-message-pending");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question || "Please analyze the attached file.",
          context: profileContext,
          attachments: files,
          previousResponseId,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) throw new Error("Assistant endpoint unavailable.");

      const data = await response.json();
      if (!data.answer) throw new Error("Empty assistant response.");
      previousResponseId = data.responseId || previousResponseId;
      renderAssistantAnswer(pending.content, data.answer);
    } catch (error) {
      pending.row.classList.add("assistant-message-error");
      pending.content.textContent = "Couldn't get a response. Your message has been restored below so you can try again.";
      // Restore the failed turn without overwriting a follow-up being drafted.
      if (!assistantInput.value.trim()) assistantInput.value = question;
      assistantAttachments = files;
      renderAssistantFiles();
    } finally {
      pending.row.classList.remove("assistant-message-pending");
      assistantBusy = false;
      assistantStatus.textContent = "";
      updateComposer();
      if (assistantMessages.scrollHeight - assistantMessages.scrollTop - assistantMessages.clientHeight < 200) assistantMessages.scrollTop = assistantMessages.scrollHeight;
    }
  });
  updateComposer();
  refreshIcons();
}

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
