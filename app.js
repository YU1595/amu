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
    { x: 58, y: 202, size: 3.8 },
    { x: 92, y: 158, size: 4.4 },
    { x: 126, y: 118, size: 3.6 },
    { x: 164, y: 134, size: 5.2 },
    { x: 198, y: 84, size: 3.4 },
    { x: 236, y: 126, size: 4.8 },
    { x: 284, y: 112, size: 4.1 },
    { x: 306, y: 158, size: 3.5 },
    { x: 270, y: 196, size: 4.6 },
    { x: 226, y: 184, size: 3.4 },
    { x: 204, y: 232, size: 4.2 },
    { x: 166, y: 258, size: 5.1 },
    { x: 128, y: 222, size: 3.8 },
    { x: 84, y: 244, size: 4.3 },
  ];
  const visibleDots = Math.min(constellationTemplate.length, Math.max(10, Math.round(count / 4)));
  const dots = constellationTemplate.slice(0, visibleDots);
  const linePairs = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [3, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [13, 0],
    [5, 9],
  ];
  const centerPairs = [3, 8, 10, 12];

  const lines = linePairs
    .filter(([from, to]) => dots[from] && dots[to])
    .map(([from, to]) => {
      const start = dots[from];
      const end = dots[to];
      return `<path class="thread-line" d="M ${start.x} ${start.y} L ${end.x} ${end.y}" />`;
    })
    .join("");

  const constellationBranches = centerPairs
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
      const size = dot.size.toFixed(1);
      return `
        <g class="thread-star-node" style="--dot-color: ${selectedEmotion.color}">
          <circle class="thread-star glow" cx="${x}" cy="${y}" r="${(dot.size * 3.6).toFixed(1)}" />
          <path class="thread-spark" d="M ${x} ${(dot.y - dot.size * 2.6).toFixed(1)} L ${x} ${(dot.y + dot.size * 2.6).toFixed(1)} M ${(dot.x - dot.size * 2.6).toFixed(1)} ${y} L ${(dot.x + dot.size * 2.6).toFixed(1)} ${y}" />
          <circle class="thread-star core" cx="${x}" cy="${y}" r="${size}" />
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
      <path class="thread-spark self-spark" d="M ${center} ${center - 36} L ${center} ${center + 36} M ${center - 36} ${center} L ${center + 36} ${center}" />
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
