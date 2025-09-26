// in-job-search-addon-chrome/popup.js

document.addEventListener("DOMContentLoaded", initPopup);

let currentJobs = [];

function initPopup() {
  const keywordInput = document.getElementById("keyword-input");
  const locationInput = document.getElementById("location-input");
  const companyInput = document.getElementById("company-input");
  const speedInput = document.getElementById("speed-input");
  const saveButton = document.getElementById("save-filters");
  const downloadCSVButton = document.getElementById("download-csv");
  const downloadJSONButton = document.getElementById("download-json");
  const statusBadge = document.getElementById("status");
  const jobList = document.getElementById("job-list");

  loadFilters({ keywordInput, locationInput, companyInput, speedInput, statusBadge });

  saveButton.addEventListener("click", () => {
    const filters = collectFilters(keywordInput, locationInput, companyInput, speedInput);
    storeFilters(filters, statusBadge);
    requestJobScan(filters, statusBadge, jobList);
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
  [keywordInput, locationInput, companyInput, speedInput].forEach((element) => {
    element.addEventListener("change", () => {
      const filters = collectFilters(keywordInput, locationInput, companyInput, speedInput);
      storeFilters(filters, statusBadge, false);
    });
  });
}

function collectFilters(keywordInput, locationInput, companyInput, speedInput) {
  return {
    keywords: keywordInput.value.trim(),
    location: locationInput.value.trim(),
    company: companyInput.value.trim(),
    speed: Number.parseInt(speedInput.value, 10) || 5000,
  };
}

function loadFilters({ keywordInput, locationInput, companyInput, speedInput, statusBadge }) {
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
    if (filters.speed) {
      speedInput.value = String(filters.speed);
    }

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
    meta.textContent = `${company}${location}`;
    listItem.appendChild(meta);

    jobList.appendChild(listItem);
  });
}

function downloadCSV(jobs, statusBadge) {
  try {
    const header = "Title,Company,Location,Link";
    const rows = jobs.map((job) => [job.title, job.company, job.location, job.link]
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
