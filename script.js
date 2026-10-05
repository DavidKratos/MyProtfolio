const cursorGlow = document.querySelector(".cursor-glow");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (cursorGlow && !reduceMotion) {
  window.addEventListener("pointermove", (event) => {
    cursorGlow.style.transform = `translate(${event.clientX - 210}px, ${event.clientY - 210}px)`;
  });
}

const reveals = document.querySelectorAll(".reveal");
if (!reduceMotion) document.documentElement.classList.add("js-reveals");
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

const menuToggle = document.querySelector(".menu-toggle");
const siteNavigation = document.querySelector("#site-navigation");
const closeNavigation = () => {
  siteNavigation?.classList.remove("is-open");
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Open navigation");
};
menuToggle?.addEventListener("click", () => {
  const isOpen = siteNavigation.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});
siteNavigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNavigation));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteNavigation?.classList.contains("is-open")) {
    closeNavigation();
    menuToggle.focus();
  }
});
const sectionLinks = Array.from(siteNavigation?.querySelectorAll("a") || []);
const navigationObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    sectionLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${entry.target.id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  });
}, { rootMargin: "-15% 0px -65% 0px" });
sectionLinks.forEach((link) => {
  const section = document.querySelector(link.getAttribute("href"));
  if (section) navigationObserver.observe(section);
});

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
David Raj Ramakrishnan is a Senior Software Engineer, Unity/C# specialist and Technical Lead in Bengaluru, India. His latest resume states 10+ years in software development, including 8+ years with Unity and C#.
Capgemini: Senior Consultant, Technical Lead & Solution Architect, June 2023-present; client Procter & Gamble. Leads SpeedShelf Desktop and SpeedShelf Lite WebGL pilot architecture, WebGL migration, memory/performance strategy, team mentoring, coding standards, code reviews and Agile delivery.
SpeedShelf Lite uses Unity, C#, WebGL, Azure Blob Storage, Python and FastAPI. Work includes authenticated project workflows, PSA/planogram import, product-image retrieval, indexed normalized-identifier matching, texture resizing and CPU/GPU handling. Tiled capture and FastAPI/ImageMagick backend stitching support 300 DPI exports up to approximately 25,000 x 39,000 pixels.
SpeedShelf Desktop uses Unity, C#, UGUI, URP and RenderTexture for planogram import, image replacement, labels, price tags, orthographic/perspective views and tiled capture.
Resume reports OpenAI API integration into shelf analytics/recommendations reduced manual review effort by approximately 80%.
Osmo (Byju's): Game Engineer II, October 2020-April 2023; reusable frameworks, UI systems, cross-functional delivery and parallel releases.
Tech Mahindra: Junior Software Engineer, August 2016-October 2020; real-time enterprise applications, more than 20 client POCs, recognition twice.
Skills include SOLID, OOP, ScriptableObjects, Unity Profiler, pooling, texture/render optimization, OpenXR, XR Interaction Toolkit, Quest, Azure App Service/Container Apps, REST, MSAL, Git LFS and mentoring.
Unity Certified Developer. Executive MBA at Dayananda Sagar University, 2025-2027, in progress. BCA, Periyar University, 2013-2016. Customer Delight Award April 2025; client appreciation for pilot architecture April 2026.
Contact: itsmedavidraj@gmail.com; +91 9092348258; linkedin.com/in/david-raj-ramakrishnan-47001696/.
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
