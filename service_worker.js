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

const PREMIUM_DAILY_LIMIT = 50;
const PREMIUM_INSIGHTS_QUERY_ID = "voyagerPremiumDashCompanyInsightsCard.9c13e41ee272f66978a821cb17d8f6fb";
const ORGANIZATION_DASH_QUERY_ID = "voyagerOrganizationDashCompanies.1164a39ce57e74d426483681eeb51d02";
const LINKEDIN_GRAPHQL_ENDPOINT = "https://www.linkedin.com/voyager/api/graphql";
const PREMIUM_INSIGHTS_STORAGE_PREFIX = "premiumInsights:";
const COMPANY_ID_CACHE_PREFIX = "premiumCompanyId:";
const PREMIUM_INSIGHTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COMPANY_ID_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const STORAGE_USAGE_THRESHOLD_BYTES = Math.floor(4.5 * 1024 * 1024);
const STORAGE_USAGE_TARGET_BYTES = Math.floor(4 * 1024 * 1024);

const jobQueue = [];
let activeJob = null;
let cooldownTimer = null;

const telemetry = createTelemetryState();

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

  await schedulePremiumInsights(result.jobs, profileKey);

  updateTelemetry(profileKey);

  const telemetrySnapshot = await getTelemetrySnapshot();

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
      telemetry: telemetrySnapshot,
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
  telemetry.lastPersistedAt = data.lastPersistedAt;
  return chrome.storage.local.set({ [key]: data });
}

async function readTelemetryFromStorage() {
  const key = getTelemetryKey();
  const stored = await chrome.storage.local.get([key]);
  const value = stored[key];
  if (value) {
    return normalizeTelemetry(value);
  }
  return createTelemetrySnapshot();
}

function getTelemetryKey() {
  const today = new Date();
  const datePart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return `telemetry:${datePart}`;
}

async function getTelemetrySnapshot() {
  const stored = await readTelemetryFromStorage();
  const normalized = normalizeTelemetry(stored ?? {});
  const premiumLimit = PREMIUM_DAILY_LIMIT;
  const premiumUsed = normalized.premiumCallsToday ?? 0;
  const premiumRemaining = Math.max(0, premiumLimit - premiumUsed);

  return {
    ...normalized,
    premiumLimit,
    premiumRemaining,
  };
}

let telemetryInitialized = false;

async function ensureTelemetryInitialized() {
  if (telemetryInitialized) {
    return;
  }

  const stored = await readTelemetryFromStorage();
  telemetry.processedToday = stored.processedToday ?? 0;
  telemetry.lastProcessedAt = stored.lastProcessedAt ?? null;
  telemetry.lastProfileUsed = stored.lastProfileUsed ?? null;
  telemetry.premiumCallsToday = stored.premiumCallsToday ?? 0;
  telemetry.premiumCompanies = Array.isArray(stored.premiumCompanies) ? [...stored.premiumCompanies] : [];
  telemetry.premiumLastRequestAt = stored.premiumLastRequestAt ?? null;
  telemetry.lastPersistedAt = stored.lastPersistedAt ?? null;
  telemetryInitialized = true;
}

async function schedulePremiumInsights(jobs, profileKey) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return;
  }

  const remainingQuota = Math.max(0, PREMIUM_DAILY_LIMIT - (telemetry.premiumCallsToday ?? 0));
  if (remainingQuota === 0) {
    console.info("Premium Insights günlük limiti dolu, yeni istek yapılmayacak.");
    return;
  }

  const uniqueCompanies = collectUniqueCompanies(jobs);
  if (uniqueCompanies.length === 0) {
    return;
  }

  const processedSet = new Set(Array.isArray(telemetry.premiumCompanies) ? telemetry.premiumCompanies : []);
  const eligible = uniqueCompanies.filter((company) => !processedSet.has(company.key)).slice(0, remainingQuota);

  if (eligible.length === 0) {
    return;
  }

  const delayRange = PROFILE_SETTINGS[profileKey]?.delayRangeMs ?? [4000, 6000];

  for (const company of eligible) {
    const cacheHit = await hasFreshPremiumInsights(company.key);
    if (cacheHit) {
      processedSet.add(company.key);
      telemetry.premiumCompanies = Array.from(processedSet);
      continue;
    }

    try {
      const fetched = await fetchAndStorePremiumInsights(company);
      if (!fetched) {
        continue;
      }

      telemetry.premiumCallsToday += 1;
      processedSet.add(company.key);
      telemetry.premiumCompanies = Array.from(processedSet);
      telemetry.premiumLastRequestAt = new Date().toISOString();

      const delayMs = getRandomDelay(delayRange);
      await sleep(delayMs);
    } catch (error) {
      console.error("Premium Insights isteği başarısız", company, error);
    }

    if (telemetry.premiumCallsToday >= PREMIUM_DAILY_LIMIT) {
      console.warn("Premium Insights kotası tamamlandı.");
      break;
    }
  }
}

function collectUniqueCompanies(jobs) {
  const unique = new Map();

  jobs.forEach((job) => {
    const companyKey = buildCompanyKey(job);
    if (!companyKey) {
      return;
    }

    if (!unique.has(companyKey.key)) {
      unique.set(companyKey.key, companyKey);
    }
  });

  return Array.from(unique.values());
}

function buildCompanyKey(job) {
  if (!job) {
    return null;
  }

  const companyId = safeString(job.companyId);
  const companySlug = safeString(job.companySlug);
  const companyUrl = safeString(job.companyUrl);
  const companyName = safeString(job.company);

  if (companyId) {
    return {
      key: `id:${companyId}`,
      companyId,
      companySlug,
      companyUrl,
      companyName,
    };
  }

  if (companySlug) {
    return {
      key: `slug:${companySlug}`,
      companyId: "",
      companySlug,
      companyUrl,
      companyName,
    };
  }

  if (companyUrl) {
    const slug = extractSlugFromUrl(companyUrl);
    if (slug) {
      return {
        key: `slug:${slug}`,
        companyId: "",
        companySlug: slug,
        companyUrl,
        companyName,
      };
    }
  }

  if (companyName) {
    const normalized = companyName.toLowerCase().replace(/\s+/g, "-");
    return {
      key: `name:${normalized}`,
      companyId: "",
      companySlug: "",
      companyUrl,
      companyName,
    };
  }

  return null;
}

async function fetchAndStorePremiumInsights(company) {
  const companyId = await resolveCompanyId(company);
  if (!companyId) {
    console.warn("Şirket ID bulunamadı, Premium Insights atlanıyor", company);
    return false;
  }

  const variablesParam = `(company:${companyId})`;
  const url = `${LINKEDIN_GRAPHQL_ENDPOINT}?includeWebMetadata=true&variables=${encodeURIComponent(variablesParam)}&queryId=${PREMIUM_INSIGHTS_QUERY_ID}`;

  const headers = await buildLinkedInHeaders();

  const response = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Premium Insights yanıtı başarısız: ${response.status}`);
  }

  const payload = await response.json();
  const { metrics, raw } = extractPremiumMetrics(payload);

  await persistPremiumInsights(company.key, {
    companyId,
    companySlug: company.companySlug,
    companyName: company.companyName,
    fetchedAt: new Date().toISOString(),
    source: "premium",
    metrics,
    raw,
    expiresAt: Date.now() + PREMIUM_INSIGHTS_TTL_MS,
  });

  return true;
}

async function resolveCompanyId(company) {
  if (company.companyId) {
    return company.companyId;
  }

  const slug = company.companySlug;
  if (!slug) {
    return "";
  }

  const cacheKey = `${COMPANY_ID_CACHE_PREFIX}${slug}`;
  const cached = await chrome.storage.local.get([cacheKey]);
  const cachedEntry = cached?.[cacheKey];
  if (cachedEntry && !isExpired(cachedEntry.expiresAt, COMPANY_ID_TTL_MS)) {
    return String(cachedEntry.value);
  }

  const variablesParam = `(universalName:${slug})`;
  const url = `${LINKEDIN_GRAPHQL_ENDPOINT}?includeWebMetadata=true&variables=${encodeURIComponent(variablesParam)}&queryId=${ORGANIZATION_DASH_QUERY_ID}`;
  const headers = await buildLinkedInHeaders();

  const response = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    console.warn(`Şirket ID çözümleme isteği başarısız (${response.status})`, slug);
    return "";
  }

  const payload = await response.json();
  const companyUrn = findCompanyUrn(payload);
  const resolvedId = extractCompanyIdFromUrn(companyUrn);

  if (resolvedId) {
    await chrome.storage.local.set({
      [cacheKey]: {
        value: resolvedId,
        expiresAt: Date.now() + COMPANY_ID_TTL_MS,
      },
    });
    return resolvedId;
  }

  return "";
}

function extractCompanyIdFromUrn(urn) {
  if (!urn || typeof urn !== "string") {
    return "";
  }

  const match = urn.match(/urn:li:(?:organization|company):(?<id>\d+)/i);
  if (match?.groups?.id) {
    return match.groups.id;
  }

  return "";
}

async function buildLinkedInHeaders() {
  const headers = new Headers();
  headers.set("accept", "application/vnd.linkedin.normalized+json+2.1");
  headers.set("x-restli-protocol-version", "2.0.0");

  const csrfToken = await getCsrfToken();
  if (csrfToken) {
    headers.set("csrf-token", csrfToken);
  }

  return headers;
}

async function getCsrfToken() {
  try {
    const cookie = await chrome.cookies.get({
      url: "https://www.linkedin.com",
      name: "JSESSIONID",
    });

    if (!cookie?.value) {
      return "";
    }

    return cookie.value.replace(/"/g, "");
  } catch (error) {
    console.warn("CSRF token alınamadı", error);
    return "";
  }
}

function extractSlugFromUrl(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/company\/([^/?#]+)/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  } catch (error) {
    console.debug("Slug çıkarma başarısız", error);
  }

  return "";
}

function findCompanyUrn(payload) {
  const stack = [payload];
  const visited = new Set();

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || typeof current !== "object") {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((item) => stack.push(item));
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (typeof value === "string" && value.includes("urn:li:company:")) {
        return value;
      }

      if (typeof key === "string" && key.includes("urn:li:company:")) {
        return key;
      }

      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
  }

  return "";
}

async function persistPremiumInsights(companyKey, payload) {
  if (!companyKey) {
    return;
  }

  const key = `${PREMIUM_INSIGHTS_STORAGE_PREFIX}${companyKey}`;
  await chrome.storage.local.set({ [key]: payload });
}

function extractPremiumMetrics(payload) {
  if (!payload) {
    return {
      metrics: {
        totalEmployees: null,
        medianTenure: null,
        growth: {
          sixMonth: null,
          oneYear: null,
          twoYear: null,
        },
        chartData: null,
      },
      raw: payload,
    };
  }

  const metrics = {
    totalEmployees: null,
    medianTenure: null,
    growth: {
      sixMonth: null,
      oneYear: null,
      twoYear: null,
    },
    chartData: null,
  };

  const visited = new Set();
  const stack = [payload];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || typeof current !== "object") {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      if (!metrics.chartData && current.every((item) => typeof item === "number" || (item && typeof item === "object"))) {
        metrics.chartData = current;
      }

      current.forEach((item) => {
        stack.push(item);
      });
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (typeof value === "number") {
        const normalizedKey = key.toLowerCase();
        if (metrics.totalEmployees === null && normalizedKey.includes("total") && normalizedKey.includes("employee")) {
          metrics.totalEmployees = value;
        }

        if (normalizedKey.includes("six") && normalizedKey.includes("month") && metrics.growth.sixMonth === null) {
          metrics.growth.sixMonth = value;
        }

        if ((normalizedKey.includes("one") && normalizedKey.includes("year")) || normalizedKey.includes("12month")) {
          if (metrics.growth.oneYear === null) {
            metrics.growth.oneYear = value;
          }
        }

        if (normalizedKey.includes("two") && normalizedKey.includes("year")) {
          if (metrics.growth.twoYear === null) {
            metrics.growth.twoYear = value;
          }
        }
      }

      if (typeof value === "string") {
        const normalizedKey = key.toLowerCase();
        if (metrics.medianTenure === null && normalizedKey.includes("median") && normalizedKey.includes("tenure")) {
          metrics.medianTenure = value;
        }

        if (metrics.totalEmployees === null && normalizedKey.includes("total") && normalizedKey.includes("employee")) {
          const numeric = parseNumberFromText(value);
          if (numeric !== null) {
            metrics.totalEmployees = numeric;
          }
        }

        if (normalizedKey.includes("six") && normalizedKey.includes("month") && metrics.growth.sixMonth === null) {
          const parsed = parseNumberFromText(value);
          if (parsed !== null) {
            metrics.growth.sixMonth = parsed;
          }
        }

        if ((normalizedKey.includes("one") && normalizedKey.includes("year")) || normalizedKey.includes("12month")) {
          if (metrics.growth.oneYear === null) {
            const parsed = parseNumberFromText(value);
            if (parsed !== null) {
              metrics.growth.oneYear = parsed;
            }
          }
        }

        if (normalizedKey.includes("two") && normalizedKey.includes("year")) {
          if (metrics.growth.twoYear === null) {
            const parsed = parseNumberFromText(value);
            if (parsed !== null) {
              metrics.growth.twoYear = parsed;
            }
          }
        }
      }

      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
  }

  return {
    metrics,
    raw: payload,
  };
}

function parseNumberFromText(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) {
    return null;
  }

  const value = Number.parseFloat(match[0]);
  if (Number.isNaN(value)) {
    return null;
  }

  return value;
}

function safeString(value) {
  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

async function hasFreshPremiumInsights(companyKey) {
  if (!companyKey) {
    return false;
  }

  const key = `${PREMIUM_INSIGHTS_STORAGE_PREFIX}${companyKey}`;
  const stored = await chrome.storage.local.get([key]);
  const entry = stored?.[key];
  if (!entry) {
    return false;
  }

  if (isExpired(entry.expiresAt, PREMIUM_INSIGHTS_TTL_MS)) {
    await chrome.storage.local.remove(key);
    return false;
  }

  return true;
}

function createTelemetryState() {
  return {
    processedToday: 0,
    lastProcessedAt: null,
    lastProfileUsed: null,
    premiumCallsToday: 0,
    premiumCompanies: [],
    premiumLastRequestAt: null,
    lastPersistedAt: null,
  };
}

function createTelemetrySnapshot() {
  const snapshot = createTelemetryState();
  snapshot.premiumCompanies = [];
  return snapshot;
}

function normalizeTelemetry(value) {
  if (!value || typeof value !== "object") {
    return createTelemetrySnapshot();
  }

  const defaults = createTelemetrySnapshot();
  return {
    ...defaults,
    ...value,
    premiumCompanies: Array.isArray(value.premiumCompanies) ? [...value.premiumCompanies] : [],
  };
}
