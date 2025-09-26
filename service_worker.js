// in-job-search-addon-chrome/service_worker.js
const JOB_SCAN_REQUEST = "startJobScan";
const JOB_COLLECT_ACTION = "collectJobs";

const jobQueue = [];
let activeJob = null;

chrome.runtime.onInstalled.addListener(() => {
  console.info("Servis işçisi yüklendi ve hazır.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.action !== JOB_SCAN_REQUEST) {
    return false;
  }

  enqueueJob({ message, sendResponse, createdAt: Date.now() });
  return true;
});

function enqueueJob(job) {
  jobQueue.push(job);
  if (!activeJob) {
    void processQueue();
  }
}

async function processQueue() {
  if (activeJob || jobQueue.length === 0) {
    return;
  }

  activeJob = jobQueue.shift() ?? null;

  if (!activeJob) {
    return;
  }

  try {
    const result = await handleJobScan(activeJob.message);
    activeJob.sendResponse({ success: true, ...result });
  } catch (error) {
    console.error("İlan taraması başarısız", error);
    activeJob.sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    activeJob = null;
    if (jobQueue.length > 0) {
      void processQueue();
    }
  }
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
