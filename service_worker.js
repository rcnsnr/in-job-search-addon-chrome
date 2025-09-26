// in-job-search-addon-chrome/service_worker.js
const JOB_SCAN_REQUEST = "startJobScan";
const JOB_COLLECT_ACTION = "collectJobs";

const PROFILE_SETTINGS = {
  conservative: {
    delayRangeMs: [6000, 10000],
    cooldownAfterBatchMs: 20000,
    batchSize: 3,
  },
  balanced: {
    delayRangeMs: [4000, 6000],
    cooldownAfterBatchMs: 12000,
    batchSize: 4,
  },
  aggressive: {
    delayRangeMs: [2000, 4000],
    cooldownAfterBatchMs: 8000,
    batchSize: 5,
  },
};

const jobQueue = [];
let activeJob = null;
let cooldownTimer = null;

const telemetry = {
  processedToday: 0,
  lastProcessedAt: null,
  lastProfileUsed: null,
};

chrome.runtime.onInstalled.addListener(() => {
  console.info("Servis işçisi yüklendi ve hazır.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }

  const { action } = message;

  if (action === "getTelemetry") {
    readTelemetryFromStorage().then((data) => {
      sendResponse({ success: true, telemetry: data });
    }).catch((error) => {
      console.error("Telemetri okunamadı", error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    });
    return true;
  }

  if (action !== JOB_SCAN_REQUEST) {
    return false;
  }

  enqueueJob({ message, sendResponse, createdAt: Date.now() });
  return true;
});

function enqueueJob(job) {
  jobQueue.push(job);
  if (!activeJob && !cooldownTimer) {
    void processQueue();
  }
}

async function processQueue() {
  if (activeJob || jobQueue.length === 0) {
    return;
  }

  await ensureTelemetryInitialized();

  activeJob = jobQueue.shift() ?? null;

  if (!activeJob) {
    return;
  }

  try {
    const result = await scheduleAndHandleJob(activeJob.message);
    activeJob.sendResponse({ success: true, ...result });
    await persistTelemetry();
  } catch (error) {
    console.error("İlan taraması başarısız", error);
    activeJob.sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    activeJob = null;
    telemetry.lastProcessedAt = new Date().toISOString();

    if (jobQueue.length > 0) {
      const cooldownMs = getCooldownIfNeeded();
      if (cooldownMs > 0) {
        cooldownTimer = setTimeout(() => {
          cooldownTimer = null;
          void processQueue();
        }, cooldownMs);
      } else {
        void processQueue();
      }
    }
  }
}

async function scheduleAndHandleJob(request) {
  const profileKey = normalizeProfileKey(request?.filters?.profile);
  const profileSettings = PROFILE_SETTINGS[profileKey];
  const delayMs = getRandomDelay(profileSettings.delayRangeMs);

  await sleep(delayMs);

  const result = await handleJobScan(request);

  updateTelemetry(profileKey);

  return {
    ...result,
    metadata: {
      ...result.metadata,
      profile: profileKey,
      delayMs,
      throttle: {
        delayRangeMs: profileSettings.delayRangeMs,
        cooldownAfterBatchMs: profileSettings.cooldownAfterBatchMs,
        batchSize: profileSettings.batchSize,
      },
    },
  };
}

async function handleJobScan(request) {
  const activeTab = await getActiveLinkedInTab();
  if (!activeTab?.id) {
    throw new Error("Aktif LinkedIn Jobs sekmesi bulunamadı.");
  }

  await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    files: ["content/jobs.js"],
  });

  const response = await sendMessageToTab(activeTab.id, {
    action: JOB_COLLECT_ACTION,
    filters: request.filters ?? {},
  });

  return {
    jobs: Array.isArray(response?.jobs) ? response.jobs : [],
    metadata: {
      processedAt: new Date().toISOString(),
      tabId: activeTab.id,
      filters: request.filters ?? {},
      telemetry: await getTelemetrySnapshot(),
    },
  };
}

async function getActiveLinkedInTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab?.url || !activeTab.url.includes("linkedin.com/jobs")) {
    throw new Error("Lütfen LinkedIn Jobs sayfasını aktif sekmede açın.");
  }

  return activeTab;
}

function sendMessageToTab(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function normalizeProfileKey(profile) {
  if (typeof profile !== "string") {
    return "balanced";
  }

  if (profile in PROFILE_SETTINGS) {
    return profile;
  }

  const lowered = profile.toLowerCase();
  if (lowered in PROFILE_SETTINGS) {
    return lowered;
  }

  return "balanced";
}

function getRandomDelay([min, max]) {
  const clampedMin = Math.max(min, 0);
  const clampedMax = Math.max(max, clampedMin + 1);
  return Math.floor(Math.random() * (clampedMax - clampedMin + 1)) + clampedMin;
}

function sleep(ms) {
  if (!ms || ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateTelemetry(profileKey) {
  telemetry.processedToday += 1;
  telemetry.lastProfileUsed = profileKey;
}

function getCooldownIfNeeded() {
  const profile = telemetry.lastProfileUsed ?? "balanced";
  const settings = PROFILE_SETTINGS[profile];
  if (!settings) {
    return 0;
  }

  if (telemetry.processedToday % settings.batchSize === 0) {
    return settings.cooldownAfterBatchMs;
  }

  return 0;
}

async function persistTelemetry() {
  const key = getTelemetryKey();
  const data = {
    ...telemetry,
    lastPersistedAt: new Date().toISOString(),
  };
  return chrome.storage.local.set({ [key]: data });
}

async function readTelemetryFromStorage() {
  const key = getTelemetryKey();
  const stored = await chrome.storage.local.get([key]);
  const value = stored[key];
  if (value) {
    return value;
  }
  return {
    ...telemetry,
    lastPersistedAt: null,
  };
}

function getTelemetryKey() {
  const today = new Date();
  const datePart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return `telemetry:${datePart}`;
}

async function getTelemetrySnapshot() {
  const stored = await readTelemetryFromStorage();
  return stored ?? { ...telemetry };
}

let telemetryInitialized = false;

async function ensureTelemetryInitialized() {
  if (telemetryInitialized) {
    return;
  }

  const stored = await readTelemetryFromStorage();
  telemetry.processedToday = stored.processedToday ?? telemetry.processedToday;
  telemetry.lastProcessedAt = stored.lastProcessedAt ?? telemetry.lastProcessedAt;
  telemetry.lastProfileUsed = stored.lastProfileUsed ?? telemetry.lastProfileUsed;
  telemetryInitialized = true;
}
