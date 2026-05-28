const emotions = [
  {
    id: "sleepless",
    name: "眠れない",
    description: "夜が長い",
    color: "#d98175",
    baseHour: 42,
    baseDay: 128,
  },
  {
    id: "lonely",
    name: "寂しい",
    description: "少し遠い",
    color: "#91acc4",
    baseHour: 37,
    baseDay: 154,
  },
  {
    id: "tired",
    name: "疲れた",
    description: "力を抜く",
    color: "#8fae9c",
    baseHour: 58,
    baseDay: 203,
  },
  {
    id: "anxious",
    name: "不安",
    description: "揺れている",
    color: "#aaa1b9",
    baseHour: 31,
    baseDay: 117,
  },
  {
    id: "relieved",
    name: "ほっとした",
    description: "息をする",
    color: "#d8aa73",
    baseHour: 23,
    baseDay: 96,
  },
  {
    id: "anyone",
    name: "誰かいる？",
    description: "ここにいる",
    color: "#ba8e86",
    baseHour: 19,
    baseDay: 84,
  },
];

const storageKeys = {
  userId: "amu:user-id",
  logs: "amu:emotion-logs",
};

const screens = {
  select: document.querySelector("#select-screen"),
  count: document.querySelector("#count-screen"),
  thread: document.querySelector("#thread-screen"),
};

const emotionGrid = document.querySelector("#emotion-grid");
const chosenEmotion = document.querySelector("#chosen-emotion");
const countLine = document.querySelector("#count-line");
const countValue = document.querySelector("#count-value");
const threadDetail = document.querySelector("#thread-detail");
const threadSvg = document.querySelector("#thread-svg");
const showThreadButton = document.querySelector("#show-thread");
const periodButtons = [...document.querySelectorAll("[data-period]")];

let selectedEmotion = emotions[0];
let selectedPeriod = "hour";

function getUserId() {
  const stored = localStorage.getItem(storageKeys.userId);
  if (stored) return stored;

  const id = crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}-${Math.random()}`;
  localStorage.setItem(storageKeys.userId, id);
  return id;
}

function getLogs() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.logs) || "[]");
  } catch {
    return [];
  }
}

function saveLog(emotionId) {
  const logs = getLogs();
  logs.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `log-${Date.now()}-${Math.random()}`,
    user_id: getUserId(),
    emotion_type: emotionId,
    created_at: new Date().toISOString(),
  });

  localStorage.setItem(storageKeys.logs, JSON.stringify(logs.slice(-80)));
}

function countLocalLogs(emotionId, hours) {
  const threshold = Date.now() - hours * 60 * 60 * 1000;
  return getLogs().filter((log) => {
    return log.emotion_type === emotionId && new Date(log.created_at).getTime() >= threshold;
  }).length;
}

function getDisplayCount(emotion, period) {
  const hours = period === "hour" ? 1 : 24;
  const base = period === "hour" ? emotion.baseHour : emotion.baseDay;
  return base + countLocalLogs(emotion.id, hours);
}

function renderEmotionButtons() {
  emotionGrid.innerHTML = emotions
    .map((emotion) => {
      return `
        <button class="emotion-button" type="button" data-emotion="${emotion.id}" style="--emotion-color: ${emotion.color}">
          <span class="emotion-label">${emotion.name}</span>
          <span class="emotion-description">${emotion.description}</span>
        </button>
      `;
    })
    .join("");
}

function setScreen(name) {
  Object.entries(screens).forEach(([screenName, element]) => {
    element.classList.toggle("is-active", screenName === name);
  });
}

function updateCountScreen() {
  const count = getDisplayCount(selectedEmotion, selectedPeriod);
  chosenEmotion.textContent = selectedEmotion.name;
  countValue.textContent = count;
  countLine.textContent =
    selectedPeriod === "hour"
      ? `今、${count}人が「${selectedEmotion.name}」と感じています。`
      : `今日、${count}人が「${selectedEmotion.name}」を置きました。`;

  periodButtons.forEach((button) => {
    const isActive = button.dataset.period === selectedPeriod;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function polarToPoint(center, radius, angle) {
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function renderThread() {
  const count = getDisplayCount(selectedEmotion, selectedPeriod);
  const visibleDots = Math.min(28, Math.max(10, Math.round(count / 5)));
  const center = 180;
  const dots = [];

  for (let index = 0; index < visibleDots; index += 1) {
    const angle = (Math.PI * 2 * index) / visibleDots + Math.sin(index * 1.7) * 0.28;
    const radius = 62 + (index % 6) * 18 + Math.sin(index * 2.2) * 10;
    dots.push({
      ...polarToPoint(center, radius, angle),
      size: 3.4 + (index % 4) * 0.8,
      angle,
    });
  }

  const lines = dots
    .map((dot, index) => {
      const next = dots[(index + 1) % dots.length];
      const shouldSkip = index % 7 === 3;
      if (shouldSkip) return "";
      return `<path class="thread-line" d="M ${dot.x.toFixed(1)} ${dot.y.toFixed(1)} L ${next.x.toFixed(1)} ${next.y.toFixed(1)}" />`;
    })
    .join("");

  const constellationBranches = dots
    .filter((_, index) => index % 5 === 1)
    .map((dot) => {
      return `<path class="thread-line thread-line-soft" d="M ${center} ${center} L ${dot.x.toFixed(1)} ${dot.y.toFixed(1)}" />`;
    })
    .join("");

  const backgroundStars = Array.from({ length: 26 }, (_, index) => {
    const x = 34 + ((index * 47) % 292);
    const y = 34 + ((index * 73) % 292);
    const radius = index % 4 === 0 ? 1.2 : 0.8;
    return `<circle class="thread-star tiny" cx="${x}" cy="${y}" r="${radius}" />`;
  }).join("");

  const dotNodes = dots
    .map((dot) => {
      const x = dot.x.toFixed(1);
      const y = dot.y.toFixed(1);
      const size = dot.size.toFixed(1);
      return `
        <g class="thread-star-node" style="--dot-color: ${selectedEmotion.color}">
          <circle class="thread-star glow" cx="${x}" cy="${y}" r="${(dot.size * 2.8).toFixed(1)}" />
          <path class="thread-spark" d="M ${x} ${(dot.y - dot.size * 2.2).toFixed(1)} L ${x} ${(dot.y + dot.size * 2.2).toFixed(1)} M ${(dot.x - dot.size * 2.2).toFixed(1)} ${y} L ${(dot.x + dot.size * 2.2).toFixed(1)} ${y}" />
          <circle class="thread-star core" cx="${x}" cy="${y}" r="${size}" />
        </g>
      `;
    })
    .join("");

  threadSvg.innerHTML = `
    <defs>
      <radialGradient id="constellation-sky" cx="50%" cy="48%" r="58%">
        <stop offset="0%" stop-color="rgba(255,250,242,0.95)" />
        <stop offset="58%" stop-color="rgba(223,226,219,0.58)" />
        <stop offset="100%" stop-color="rgba(145,172,196,0.28)" />
      </radialGradient>
      <filter id="soft-star-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <circle cx="${center}" cy="${center}" r="150" fill="url(#constellation-sky)" />
    ${backgroundStars}
    ${lines}
    ${constellationBranches}
    ${dotNodes}
    <g class="thread-star-node self" style="--dot-color: ${selectedEmotion.color}">
      <circle class="thread-star glow" cx="${center}" cy="${center}" r="28" />
      <path class="thread-spark self-spark" d="M ${center} ${center - 32} L ${center} ${center + 32} M ${center - 32} ${center} L ${center + 32} ${center}" />
      <circle class="thread-star core self-core" cx="${center}" cy="${center}" r="10" />
    </g>
  `;

  threadDetail.textContent = `${count}人の「${selectedEmotion.name}」が、匿名の星として静かな星座をつくっています。`;
}

renderEmotionButtons();
getUserId();

emotionGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-emotion]");
  if (!button) return;

  selectedEmotion = emotions.find((emotion) => emotion.id === button.dataset.emotion);
  selectedPeriod = "hour";
  saveLog(selectedEmotion.id);
  updateCountScreen();
  setScreen("count");
});

periodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedPeriod = button.dataset.period;
    updateCountScreen();
  });
});

showThreadButton.addEventListener("click", () => {
  renderThread();
  setScreen("thread");
});

document.querySelector("[data-back]").addEventListener("click", () => {
  setScreen("select");
});

document.querySelector("[data-back-count]").addEventListener("click", () => {
  updateCountScreen();
  setScreen("count");
});
