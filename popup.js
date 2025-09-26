// in-job-search-addon-chrome/popup.js

document.addEventListener("DOMContentLoaded", initPopup);

let currentJobs = [];
const MAX_KEYWORD_ITEMS = 50;

function initPopup() {
  const keywordInput = document.getElementById("keyword-input");
  const locationInput = document.getElementById("location-input");
  const companyInput = document.getElementById("company-input");
  const experienceInput = document.getElementById("experience-input");
  const industryInput = document.getElementById("industry-input");
  const keywordWhitelistInput = document.getElementById("keyword-whitelist");
  const keywordBlacklistInput = document.getElementById("keyword-blacklist");
  const minSalaryInput = document.getElementById("min-salary-input");
  const profileInput = document.getElementById("profile-input");
  const remoteOnlyInput = document.getElementById("remote-only");
  const maxAgeInput = document.getElementById("max-age-input");
  const saveButton = document.getElementById("save-filters");
  const downloadCSVButton = document.getElementById("download-csv");
  const downloadJSONButton = document.getElementById("download-json");
  const statusBadge = document.getElementById("status");
  const jobList = document.getElementById("job-list");
  const telemetryContainer = document.getElementById("telemetry");

  loadFilters({
    keywordInput,
    locationInput,
    companyInput,
    experienceInput,
    industryInput,
    keywordWhitelistInput,
    keywordBlacklistInput,
    minSalaryInput,
    profileInput,
    remoteOnlyInput,
    maxAgeInput,
    statusBadge,
  });

  refreshTelemetry(telemetryContainer);

  saveButton.addEventListener("click", () => {
    const filters = collectFilters(
      keywordInput,
      locationInput,
      companyInput,
      experienceInput,
      industryInput,
      keywordWhitelistInput,
      keywordBlacklistInput,
      minSalaryInput,
      profileInput,
      remoteOnlyInput,
      maxAgeInput,
    );

    const validation = validateKeywordFilters(filters, statusBadge);
    if (!validation.ok) {
      return;
    }

    const normalizedFilters = {
      ...filters,
      keywordWhitelist: validation.whitelist,
      keywordBlacklist: validation.blacklist,
    };

    storeFilters(normalizedFilters, statusBadge);
    requestJobScan(normalizedFilters, statusBadge, jobList);
  });

  downloadCSVButton.addEventListener("click", () => {
    if (!currentJobs.length) {
      setStatus(statusBadge, "empty", "İndirilecek sonuç bulunamadı.");
      return;
    }
    downloadCSV(currentJobs, statusBadge);
  });

  downloadJSONButton.addEventListener("click", () => {
    if (!currentJobs.length) {
      setStatus(statusBadge, "empty", "İndirilecek sonuç bulunamadı.");
      return;
    }
    downloadJSON(currentJobs, statusBadge);
  });

  // Manuel yenilemeler için tarama hızını değiştirdiğinde otomatik kaydet.
  [
    keywordInput,
    locationInput,
    companyInput,
    experienceInput,
    industryInput,
    keywordWhitelistInput,
    keywordBlacklistInput,
    minSalaryInput,
    profileInput,
    remoteOnlyInput,
    maxAgeInput,
  ].forEach((element) => {
    element.addEventListener("change", () => {
      const filters = collectFilters(
        keywordInput,
        locationInput,
        companyInput,
        experienceInput,
        industryInput,
        keywordWhitelistInput,
        keywordBlacklistInput,
        minSalaryInput,
        profileInput,
        remoteOnlyInput,
        maxAgeInput,
      );

      const validation = validateKeywordFilters(filters, statusBadge, { silent: true });
      if (!validation.ok) {
        return;
      }

      const normalizedFilters = {
        ...filters,
        keywordWhitelist: validation.whitelist,
        keywordBlacklist: validation.blacklist,
      };

      storeFilters(normalizedFilters, statusBadge, false);
    });
  });
}

function parseKeywordListValue(rawValue) {
  if (!rawValue) {
    return [];
  }

  const items = rawValue
    .split(/\r?\n|,/)
    .map((item) => normalizeKeywordValue(item))
    .filter(Boolean);

  const seen = new Set();
  const result = [];

  items.forEach((item) => {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  });

  return result;
}

function formatKeywordTextarea(value) {
  if (!value) {
    return "";
  }

  const list = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim() ? [value] : [];

  const sanitized = sanitizeKeywordList(list);
  return sanitized.items.join("\n");
}

function collectFilters(
  keywordInput,
  locationInput,
  companyInput,
  experienceInput,
  industryInput,
  keywordWhitelistInput,
  keywordBlacklistInput,
  minSalaryInput,
  profileInput,
  remoteOnlyInput,
  maxAgeInput,
) {
  const maxAgeRaw = maxAgeInput.value.trim();
  const parsedMaxAge = Number.parseInt(maxAgeRaw, 10);
  const minSalaryRaw = minSalaryInput.value.trim();
  const parsedMinSalary = Number.parseInt(minSalaryRaw, 10);

  return {
    keywords: keywordInput.value.trim(),
    location: locationInput.value.trim(),
    company: companyInput.value.trim(),
    experience: experienceInput.value.trim(),
    industry: industryInput.value.trim(),
    keywordWhitelist: parseKeywordListValue(keywordWhitelistInput.value),
    keywordBlacklist: parseKeywordListValue(keywordBlacklistInput.value),
    minSalary: Number.isNaN(parsedMinSalary) ? null : parsedMinSalary,
    profile: profileInput.value,
    remoteOnly: remoteOnlyInput.checked,
    maxAgeDays: Number.isNaN(parsedMaxAge) ? null : parsedMaxAge,
  };
}

function loadFilters({
  keywordInput,
  locationInput,
  companyInput,
  experienceInput,
  industryInput,
  keywordWhitelistInput,
  keywordBlacklistInput,
  minSalaryInput,
  profileInput,
  remoteOnlyInput,
  maxAgeInput,
  statusBadge,
}) {
  chrome.storage.local.get(["filters"], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Filtreler yüklenirken hata oluştu", chrome.runtime.lastError);
      setStatus(statusBadge, "error", "Filtreler yüklenemedi.");
      return;
    }

    const filters = result?.filters ?? {};
    keywordInput.value = filters.keywords ?? "";
    locationInput.value = filters.location ?? "";
    companyInput.value = filters.company ?? "";
    experienceInput.value = filters.experience ?? "";
    industryInput.value = filters.industry ?? "";
    const sanitizedFromStorage = validateKeywordFilters({
      keywordWhitelist: Array.isArray(filters.keywordWhitelist) ? filters.keywordWhitelist : [],
      keywordBlacklist: Array.isArray(filters.keywordBlacklist) ? filters.keywordBlacklist : [],
    }, statusBadge, { silent: true, skipLimits: true });

    keywordWhitelistInput.value = formatKeywordTextarea(sanitizedFromStorage.whitelist);
    keywordBlacklistInput.value = formatKeywordTextarea(sanitizedFromStorage.blacklist);
    minSalaryInput.value = filters.minSalary ?? "";
    profileInput.value = filters.profile ?? inferProfileFromLegacySpeed(filters.speed);
    remoteOnlyInput.checked = Boolean(filters.remoteOnly);
    maxAgeInput.value = filters.maxAgeDays ?? "";

    setStatus(statusBadge, "ready", "Hazır");
  });
}

function storeFilters(filters, statusBadge, showMessage = true) {
  chrome.storage.local.set({ filters }, () => {
    if (chrome.runtime.lastError) {
      console.error("Filtreler kaydedilirken hata oluştu", chrome.runtime.lastError);
      setStatus(statusBadge, "error", "Filtreler kaydedilemedi.");
      return;
    }

    if (showMessage) {
      setStatus(statusBadge, "ready", "Filtreler kaydedildi. Tarama başlatılıyor...");
    }
  });
}

function requestJobScan(filters, statusBadge, jobList) {
  setStatus(statusBadge, "loading", "İlan taraması başlatıldı...");
  renderJobs(jobList, []);

  chrome.runtime.sendMessage({
    action: "startJobScan",
    filters,
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Servis işçisi ile iletişim kurulamadı", chrome.runtime.lastError);
      setStatus(statusBadge, "error", "Servis işçisi yanıt vermedi.");
      return;
    }

    if (!response?.success) {
      setStatus(statusBadge, "error", response?.error ?? "Tarama başarısız oldu.");
      return;
    }

    currentJobs = response.jobs ?? [];
    renderJobs(jobList, currentJobs);

    if (currentJobs.length === 0) {
      setStatus(statusBadge, "empty", "Sonuç bulunamadı.");
      return;
    }

    const info = `${currentJobs.length} ilan bulundu (${new Date(response.metadata?.processedAt ?? Date.now()).toLocaleTimeString("tr-TR")})`;
    setStatus(statusBadge, "success", info);

    renderTelemetry(
      document.getElementById("telemetry"),
      response.metadata?.telemetry,
      {
        profile: response.metadata?.profile,
        delayMs: response.metadata?.delayMs,
        throttle: response.metadata?.throttle,
      },
    );

    refreshTelemetry(document.getElementById("telemetry"));
  });
}

function renderJobs(jobList, jobs) {
  jobList.innerHTML = "";

  if (!jobs.length) {
    const placeholder = document.createElement("li");
    placeholder.textContent = "Henüz sonuç yok.";
    jobList.appendChild(placeholder);
    return;
  }

  jobs.forEach((job) => {
    const listItem = document.createElement("li");
    const title = job.title || "İsimsiz ilan";
    const company = job.company ? ` • ${job.company}` : "";
    const location = job.location ? ` • ${job.location}` : "";
    const workplace = job.workplaceType ? ` • ${job.workplaceType}` : "";
    const posted = job.postedAt ? ` • ${formatRelativeDate(job.postedAt)}` : "";
    const experience = job.experienceLevel ? ` • ${job.experienceLevel}` : "";
    const industries = Array.isArray(job.industries) && job.industries.length > 0
      ? ` • ${job.industries.join(" / ")}`
      : "";
    const salary = job.salaryText ? ` • ${job.salaryText}` : "";

    if (job.link) {
      const link = document.createElement("a");
      link.href = job.link;
      link.textContent = title;
      link.className = "job-link";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      listItem.appendChild(link);
    } else {
      listItem.textContent = title;
    }

    const meta = document.createElement("span");
    meta.textContent = `${company}${location}${workplace}${posted}${experience}${industries}${salary}`;
    listItem.appendChild(meta);

    jobList.appendChild(listItem);
  });
}

function downloadCSV(jobs, statusBadge) {
  try {
    const header = "Title,Company,Location,WorkplaceType,PostedAt,ExperienceLevel,Industries,SalaryMin,SalaryMax,SalaryText,Link";
    const rows = jobs.map((job) => [
      job.title,
      job.company,
      job.location,
      job.workplaceType,
      job.postedAt,
      job.experienceLevel,
      Array.isArray(job.industries) ? job.industries.join(" | ") : job.industries,
      job.salaryMin,
      job.salaryMax,
      job.salaryText,
      job.link,
    ]
      .map((value) => `"${(value ?? "").replaceAll('"', '""')}"`).join(","));
    const csvContent = `data:text/csv;charset=utf-8,${[header, ...rows].join("\n")}`;

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "filtered_jobs.csv";
    link.click();

    setStatus(statusBadge, "success", "CSV indirildi.");
  } catch (error) {
    console.error("CSV oluşturulamadı", error);
    setStatus(statusBadge, "error", "CSV indirme başarısız oldu.");
  }
}

function downloadJSON(jobs, statusBadge) {
  try {
    const jsonContent = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(jobs, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonContent;
    link.download = "filtered_jobs.json";
    link.click();

    setStatus(statusBadge, "success", "JSON indirildi.");
  } catch (error) {
    console.error("JSON oluşturulamadı", error);
    setStatus(statusBadge, "error", "JSON indirme başarısız oldu.");
  }
}

function setStatus(statusBadge, state, message) {
  const allowedStates = ["ready", "loading", "success", "error", "empty"];
  const normalizedState = allowedStates.includes(state) ? state : "ready";
  statusBadge.textContent = message;
  statusBadge.className = `status status--${normalizedState}`;
}

function inferProfileFromLegacySpeed(speed) {
  if (!speed) {
    return "balanced";
  }

  const numeric = Number(speed);
  if (Number.isNaN(numeric)) {
    return "balanced";
  }

  if (numeric >= 7000) {
    return "conservative";
  }

  if (numeric <= 3000) {
    return "aggressive";
  }

  return "balanced";
}

function formatRelativeDate(isoString) {
  if (!isoString) {
    return "";
  }

  const timestamp = Date.parse(isoString);
  if (Number.isNaN(timestamp)) {
    return isoString;
  }

  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Bugün";
  }

  if (diffDays === 1) {
    return "1 gün önce";
  }

  return `${diffDays} gün önce`;
}

function refreshTelemetry(container) {
  if (!container) {
    return;
  }

  chrome.runtime.sendMessage({ action: "getTelemetry" }, (response) => {
    if (chrome.runtime.lastError) {
      renderTelemetryError(container, chrome.runtime.lastError.message);
      return;
    }

    if (!response?.success) {
      renderTelemetryError(container, response?.error ?? "Telemetri alınamadı");
      return;
    }

    renderTelemetry(container, response.telemetry);
  });
}

function renderTelemetry(container, telemetry, metadata = {}) {
  if (!container) {
    return;
  }

  const processedToday = telemetry?.processedToday ?? 0;
  const lastProfile = metadata.profile ?? telemetry?.lastProfileUsed ?? "Belirsiz";
  const delayInfo = metadata.delayMs ? `${metadata.delayMs} ms` : "—";
  const throttleRange = Array.isArray(metadata?.throttle?.delayRangeMs)
    ? `${metadata.throttle.delayRangeMs[0]}–${metadata.throttle.delayRangeMs[1]} ms`
    : "—";
  const lastProcessed = telemetry?.lastProcessedAt
    ? formatRelativeTimestamp(telemetry.lastProcessedAt)
    : "Henüz işlenmedi";
  const premiumLimit = telemetry?.premiumLimit ?? 50;
  const premiumUsed = telemetry?.premiumCallsToday ?? 0;
  const premiumRemaining = telemetry?.premiumRemaining ?? Math.max(0, premiumLimit - premiumUsed);
  const premiumLast = telemetry?.premiumLastRequestAt
    ? formatRelativeTimestamp(telemetry.premiumLastRequestAt)
    : "Henüz istek yok";

  container.innerHTML = `
    <h4>Günlük Profil Durumu</h4>
    <p class="telemetry__stat"><strong>Aktif profil:</strong> ${lastProfile}</p>
    <p class="telemetry__stat"><strong>Bugün işlenen görev:</strong> ${processedToday}</p>
    <p class="telemetry__stat"><strong>Son gecikme:</strong> ${delayInfo}</p>
    <p class="telemetry__stat"><strong>Profil aralığı:</strong> ${throttleRange}</p>
    <p class="telemetry__stat"><strong>Son işleme zamanı:</strong> ${lastProcessed}</p>
    <hr>
    <p class="telemetry__stat"><strong>Premium toplam kota:</strong> ${premiumLimit}</p>
    <p class="telemetry__stat"><strong>Premium kullanılan:</strong> ${premiumUsed}</p>
    <p class="telemetry__stat"><strong>Kalan Premium kota:</strong> ${premiumRemaining}</p>
    <p class="telemetry__stat"><strong>Son Premium isteği:</strong> ${premiumLast}</p>
  `;
}

function renderTelemetryError(container, message) {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <h4>Günlük Profil Durumu</h4>
    <p class="telemetry__stat">Telemetri yüklenemedi: ${message}</p>
  `;
}

function formatRelativeTimestamp(value) {
  if (!value) {
    return "Henüz işlenmedi";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "Şimdi";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} dk önce`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} saat önce`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} gün önce`;
  }

  return new Date(timestamp).toLocaleString("tr-TR");
}
