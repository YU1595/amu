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
  const center = 180;
  const constellationTemplate = [
    { x: 48, y: 240, size: 4.6 },
    { x: 86, y: 198, size: 5.2 },
    { x: 126, y: 166, size: 4.4 },
    { x: 166, y: 188, size: 6.2 },
    { x: 204, y: 142, size: 4.8 },
    { x: 248, y: 164, size: 5.6 },
    { x: 300, y: 124, size: 4.7 },
    { x: 316, y: 184, size: 4.3 },
    { x: 138, y: 96, size: 3.9 },
    { x: 196, y: 76, size: 4.4 },
    { x: 230, y: 230, size: 4.8 },
    { x: 184, y: 274, size: 5.4 },
    { x: 112, y: 252, size: 4.2 },
    { x: 74, y: 104, size: 3.8 },
  ];
  const visibleDots = Math.min(constellationTemplate.length, Math.max(9, Math.round(count / 18)));
  const dots = constellationTemplate.slice(0, visibleDots);
  const linePairs = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [2, 8],
    [8, 9],
    [5, 10],
    [10, 11],
    [11, 12],
    [1, 13],
  ];
  const selfPairs = [3, 4, 10];

  const lines = linePairs
    .filter(([from, to]) => dots[from] && dots[to])
    .map(([from, to]) => {
      const start = dots[from];
      const end = dots[to];
      return `<path class="thread-line" d="M ${start.x} ${start.y} L ${end.x} ${end.y}" />`;
    })
    .join("");

  const constellationBranches = selfPairs
    .filter((index) => dots[index])
    .map((index) => {
      const dot = dots[index];
      return `<path class="thread-line thread-line-soft" d="M ${center} ${center} L ${dot.x} ${dot.y}" />`;
    })
    .join("");

  const backgroundStars = Array.from({ length: 42 }, (_, index) => {
    const x = 28 + ((index * 53) % 304);
    const y = 28 + ((index * 79) % 304);
    const radius = index % 6 === 0 ? 1.35 : 0.78;
    return `<circle class="thread-star tiny" cx="${x}" cy="${y}" r="${radius}" />`;
  }).join("");

  const dotNodes = dots
    .map((dot) => {
      const x = dot.x;
      const y = dot.y;
      const size = dot.size;
      const inner = size * 0.38;
      const long = size * 2.15;
      return `
        <g class="thread-star-node" style="--dot-color: ${selectedEmotion.color}">
          <circle class="thread-star glow" cx="${x}" cy="${y}" r="${(size * 4.2).toFixed(1)}" />
          <path class="thread-star-shape" d="M ${x} ${(y - long).toFixed(1)} L ${(x + inner).toFixed(1)} ${(y - inner).toFixed(1)} L ${(x + long).toFixed(1)} ${y} L ${(x + inner).toFixed(1)} ${(y + inner).toFixed(1)} L ${x} ${(y + long).toFixed(1)} L ${(x - inner).toFixed(1)} ${(y + inner).toFixed(1)} L ${(x - long).toFixed(1)} ${y} L ${(x - inner).toFixed(1)} ${(y - inner).toFixed(1)} Z" />
          <circle class="thread-star core" cx="${x}" cy="${y}" r="${(size * 0.52).toFixed(1)}" />
        </g>
      `;
    })
    .join("");

  threadSvg.innerHTML = `
    <defs>
      <radialGradient id="constellation-sky" cx="50%" cy="48%" r="62%">
        <stop offset="0%" stop-color="#405162" />
        <stop offset="58%" stop-color="#253544" />
        <stop offset="100%" stop-color="#17242f" />
      </radialGradient>
      <filter id="soft-star-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <circle cx="${center}" cy="${center}" r="158" fill="url(#constellation-sky)" />
    <circle cx="${center}" cy="${center}" r="157" fill="none" stroke="rgba(255,250,226,0.2)" stroke-width="1" />
    ${backgroundStars}
    ${lines}
    ${constellationBranches}
    ${dotNodes}
    <g class="thread-star-node self" style="--dot-color: ${selectedEmotion.color}">
      <circle class="thread-star glow" cx="${center}" cy="${center}" r="34" />
      <path class="thread-star-shape self-spark" d="M ${center} ${center - 23} L ${center + 4} ${center - 4} L ${center + 23} ${center} L ${center + 4} ${center + 4} L ${center} ${center + 23} L ${center - 4} ${center + 4} L ${center - 23} ${center} L ${center - 4} ${center - 4} Z" />
      <circle class="thread-star core self-core" cx="${center}" cy="${center}" r="5.8" />
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
