// in-job-search-addon-chrome/content/jobs.js
(function () {
  if (window.__linkedInJobScraperInitialized) {
    return;
  }

  window.__linkedInJobScraperInitialized = true;

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request?.action === "collectJobs") {
      try {
        const jobs = collectJobs(request.filters ?? {});
        sendResponse({ jobs });
      } catch (error) {
        console.error("İlan toplama hatası", error);
        sendResponse({ jobs: [], error: error instanceof Error ? error.message : String(error) });
      }
      return true;
    }
    return false;
  });

  function collectJobs(filters) {
    const cards = document.querySelectorAll("li.jobs-search-results__list-item");
    const jobs = [];

    cards.forEach((card) => {
      const job = extractJob(card);

      if (passesFilters(job, filters)) {
        jobs.push(job);
      }
    });

    return jobs;
  }

  function extractJob(card) {
    const titleElement = card.querySelector("a.job-card-list__title");
    const companyElement = card.querySelector("a.job-card-container__company-name");
    const locationElement = card.querySelector("ul.job-card-container__metadata li");
    const listedAt = card.querySelector("time");

    return {
      title: titleElement?.textContent?.trim() ?? "",
      company: companyElement?.textContent?.trim() ?? "",
      location: locationElement?.textContent?.trim() ?? "",
      link: titleElement?.href ?? "",
      postedAt: listedAt?.getAttribute("datetime") ?? "",
    };
  }

  function passesFilters(job, filters) {
    const keywordPass = matchKeywords(job.title, filters.keywords);
    const locationPass = matchLocation(job.location, filters.location);
    const companyPass = matchCompany(job.company, filters.company);
    return keywordPass && locationPass && companyPass;
  }

  function matchKeywords(title, keywords) {
    if (!keywords) return true;
    const list = keywords.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (list.length === 0) return true;
    const lower = title.toLowerCase();
    return list.some((keyword) => lower.includes(keyword));
  }

  function matchLocation(location, filter) {
    if (!filter) return true;
    const list = filter.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (list.length === 0) return true;
    const lower = location.toLowerCase();
    return list.some((item) => lower.includes(item));
  }

  function matchCompany(company, filter) {
    if (!filter) return true;
    const list = filter.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (list.length === 0) return true;
    const lower = company.toLowerCase();
    return list.some((item) => lower.includes(item));
  }
})();
