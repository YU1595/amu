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
  const visibleDots = Math.min(34, Math.max(12, Math.round(count / 4)));
  const center = 180;
  const dots = [];

  for (let index = 0; index < visibleDots; index += 1) {
    const angle = (Math.PI * 2 * index) / visibleDots + Math.sin(index * 1.9) * 0.22;
    const radius = 72 + (index % 5) * 19 + Math.sin(index * 2.4) * 8;
    dots.push({
      ...polarToPoint(center, radius, angle),
      size: 4.2 + (index % 4) * 0.75,
      angle,
    });
  }

  const lines = dots
    .map((dot, index) => {
      const next = dots[(index + 1) % dots.length];
      const pull = 0.16 + (index % 3) * 0.04;
      const c1x = dot.x + (center - dot.x) * pull;
      const c1y = dot.y + (center - dot.y) * pull;
      const c2x = next.x + (center - next.x) * pull;
      const c2y = next.y + (center - next.y) * pull;
      return `<path class="thread-line" d="M ${dot.x.toFixed(1)} ${dot.y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}" />`;
    })
    .join("");

  const spokes = dots
    .filter((_, index) => index % 4 === 0)
    .map((dot) => {
      return `<path class="thread-line" d="M ${center} ${center} Q ${(center + dot.x) / 2} ${((center + dot.y) / 2 - 10).toFixed(1)}, ${dot.x.toFixed(1)} ${dot.y.toFixed(1)}" />`;
    })
    .join("");

  const dotNodes = dots
    .map((dot) => {
      return `<circle class="thread-dot" style="--dot-color: ${selectedEmotion.color}" cx="${dot.x.toFixed(1)}" cy="${dot.y.toFixed(1)}" r="${dot.size.toFixed(1)}" />`;
    })
    .join("");

  threadSvg.innerHTML = `
    <circle cx="${center}" cy="${center}" r="126" fill="rgba(255,250,242,0.48)" />
    ${lines}
    ${spokes}
    ${dotNodes}
    <circle class="thread-dot self" style="--dot-color: ${selectedEmotion.color}" cx="${center}" cy="${center}" r="10" />
  `;

  threadDetail.textContent = `${count}人の「${selectedEmotion.name}」が、匿名の点としてそっと集まっています。`;
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
