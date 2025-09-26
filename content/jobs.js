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
      workplaceType: determineWorkplaceType(card),
      experienceLevel: determineExperienceLevel(card),
      industries: determineIndustries(card),
      ...determineSalary(card),
    };
  }

  function passesFilters(job, filters) {
    const keywordPass = matchKeywords(job.title, filters.keywords);
    const locationPass = matchLocation(job.location, filters.location);
    const companyPass = matchCompany(job.company, filters.company);
    const remotePass = filters.remoteOnly ? matchRemote(job) : true;
    const agePass = matchMaxAge(job.postedAt, filters.maxAgeDays);
    const experiencePass = matchExperience(job.experienceLevel, filters.experience);
    const industryPass = matchIndustry(job.industries, filters.industry);
    const salaryPass = matchMinSalary(job, filters.minSalary);

    return keywordPass && locationPass && companyPass && remotePass && agePass && experiencePass && industryPass && salaryPass;
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

  function matchExperience(experienceLevel, filter) {
    if (!filter) return true;
    const list = filter.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (list.length === 0) return true;
    const lower = (experienceLevel ?? "").toLowerCase();
    return list.some((item) => lower.includes(item));
  }

  function matchIndustry(industries, filter) {
    if (!filter) return true;
    const list = filter.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (list.length === 0) return true;

    const pool = Array.isArray(industries) ? industries : [industries];
    const normalizedPool = pool.filter(Boolean).map((item) => item.toLowerCase());

    if (normalizedPool.length === 0) {
      return false;
    }

    return list.some((needle) => normalizedPool.some((target) => target.includes(needle)));
  }

  function matchRemote(job) {
    const type = job.workplaceType?.toLowerCase?.() ?? "";
    if (type.includes("remote") || type.includes("uzaktan")) {
      return true;
    }

    const location = job.location?.toLowerCase?.() ?? "";
    if (location.includes("remote") || location.includes("uzaktan")) {
      return true;
    }

    return false;
  }

  function matchMaxAge(postedAt, maxAgeDays) {
    if (!maxAgeDays || maxAgeDays <= 0) {
      return true;
    }

    if (!postedAt) {
      return false;
    }

    const timestamp = Date.parse(postedAt);
    if (Number.isNaN(timestamp)) {
      return true;
    }

    const diffDays = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    return diffDays <= maxAgeDays;
  }

  function matchMinSalary(job, minSalary) {
    if (!minSalary || Number.isNaN(Number(minSalary))) {
      return true;
    }

    const floor = Number(minSalary);
    if (job.salaryMin && job.salaryMin >= floor) {
      return true;
    }

    if (job.salaryMax && job.salaryMax >= floor) {
      return true;
    }

    return false;
  }

  function determineWorkplaceType(card) {
    const textSources = new Set();

    const badgeSelectors = [
      '[data-test-result-card__workplace-type]',
      '.job-card-container__metadata-item',
      '.job-card-container__metadata span',
      '.job-card-container__badge-text',
    ];

    badgeSelectors.forEach((selector) => {
      card.querySelectorAll(selector).forEach((element) => {
        const value = element.textContent?.trim();
        if (value) {
          textSources.add(value.toLowerCase());
        }
      });
    });

    const joinedText = card.textContent?.toLowerCase?.() ?? "";
    if (joinedText) {
      textSources.add(joinedText);
    }

    if (hasRemoteIndicator(textSources)) {
      return "Remote";
    }

    if (hasHybridIndicator(textSources)) {
      return "Hybrid";
    }

    if (hasOnsiteIndicator(textSources)) {
      return "On-site";
    }

    return "";
  }

  function hasRemoteIndicator(texts) {
    for (const text of texts) {
      if (text.includes("remote") || text.includes("uzaktan")) {
        return true;
      }
    }
    return false;
  }

  function hasHybridIndicator(texts) {
    for (const text of texts) {
      if (text.includes("hybrid") || text.includes("hibrit")) {
        return true;
      }
    }
    return false;
  }

  function hasOnsiteIndicator(texts) {
    for (const text of texts) {
      if (text.includes("on-site") || text.includes("ofis")) {
        return true;
      }
    }
    return false;
  }

  function determineExperienceLevel(card) {
    const selectors = [
      "span.job-card-container__metadata-item",
      "span.job-card-list__experience-level",
      "li.job-card-container__metadata-item",
    ];

    for (const selector of selectors) {
      const element = card.querySelector(selector);
      const value = element?.textContent?.trim();
      if (value && isExperienceKeyword(value)) {
        return normalizeWhitespace(value);
      }
    }

    const summary = card.textContent ?? "";
    const experienceMatch = summary.match(/(entry|junior|mid|senior|director|manager)/i);
    if (experienceMatch) {
      return capitalize(experienceMatch[0]);
    }

    return "";
  }

  function determineIndustries(card) {
    const selectors = [
      "ul.job-card-container__metadata",
      "div.job-card-container__metadata",
      "div.job-card-list__insight",
    ];

    const industries = new Set();

    selectors.forEach((selector) => {
      card.querySelectorAll(`${selector} span, ${selector} li`).forEach((node) => {
        const value = node.textContent?.trim();
        if (value && isIndustryHint(value)) {
          industries.add(normalizeWhitespace(value));
        }
      });
    });

    return Array.from(industries);
  }

  function determineSalary(card) {
    const selectors = [
      "span.job-card-container__salary-info",
      "div.job-card-container__salary-info",
      "span.job-card-container__metadata-item",
    ];

    for (const selector of selectors) {
      const node = card.querySelector(selector);
      const text = node?.textContent?.trim();
      if (text && hasSalaryIndicator(text)) {
        return parseSalary(text);
      }
    }

    const rawText = card.textContent ?? "";
    if (hasSalaryIndicator(rawText)) {
      return parseSalary(rawText);
    }

    return { salaryMin: null, salaryMax: null, salaryText: "" };
  }

  function isExperienceKeyword(value) {
    const normalized = value.toLowerCase();
    return [
      "entry",
      "junior",
      "mid",
      "senior",
      "director",
      "lead",
      "manager",
      "chief",
    ].some((keyword) => normalized.includes(keyword));
  }

  function isIndustryHint(value) {
    const normalized = value.toLowerCase();
    if (normalized.includes("full-time") || normalized.includes("part-time")) {
      return false;
    }
    if (normalized.includes("remote") || normalized.includes("hybrid") || normalized.includes("on-site")) {
      return false;
    }
    return normalized.includes("industry") || normalized.includes("sector") || normalized.includes("technology") || normalized.includes("software") || normalized.includes("finance") || normalized.includes("marketing");
  }

  function hasSalaryIndicator(text) {
    const normalized = text.toLowerCase();
    return normalized.includes("₺") || normalized.includes("$") || normalized.includes("€") || normalized.includes("salary") || /\d+\s*(k|bin)/i.test(normalized);
  }

  function parseSalary(text) {
    const normalized = normalizeWhitespace(text);
    const rangeMatch = normalized.match(/(?<min>[\d.,]+)\s*(?:-|–|to)\s*(?<max>[\d.,]+)/i);
    const singleMatch = normalized.match(/(?<value>[\d.,]+)\s*(k|bin)?/i);

    let salaryMin = null;
    let salaryMax = null;

    if (rangeMatch?.groups) {
      salaryMin = parseSalaryValue(rangeMatch.groups.min, rangeMatch[0]);
      salaryMax = parseSalaryValue(rangeMatch.groups.max, rangeMatch[0]);
    } else if (singleMatch?.groups?.value) {
      const parsed = parseSalaryValue(singleMatch.groups.value, singleMatch[0]);
      salaryMin = parsed;
      salaryMax = parsed;
    }

    return {
      salaryMin,
      salaryMax,
      salaryText: normalized,
    };
  }

  function parseSalaryValue(value, context) {
    if (!value) {
      return null;
    }

    const cleaned = value.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(/,/g, "");
    let numeric = Number.parseInt(cleaned, 10);

    if (Number.isNaN(numeric)) {
      return null;
    }

    if (/\b(k|bin)\b/i.test(context)) {
      numeric *= 1000;
    }

    return numeric;
  }

  function normalizeWhitespace(value) {
    return value.replace(/\s+/g, " ").trim();
  }

  function capitalize(value) {
    if (!value) {
      return "";
    }
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
})();
