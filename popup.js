document.addEventListener('DOMContentLoaded', () => {
    const jobList = document.getElementById('job-list');
    const keywordInput = document.getElementById('keyword-input');
    const locationInput = document.getElementById('location-input');
    const companyInput = document.getElementById('company-input');
    const speedInput = document.getElementById('speed-input');
    const saveButton = document.getElementById('save-filters');
    const downloadCSVButton = document.getElementById('download-csv');
    const downloadJSONButton = document.getElementById('download-json');
    let currentJobs = []; // Filtrelenmiş ilanları tutar

    const fetchJobs = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "startJobScan",
                filters: {
                    keywords: keywordInput.value,
                    location: locationInput.value,
                    company: companyInput.value,
                    speed: parseInt(speedInput.value)
                }
            }, (response) => {
                currentJobs = response?.jobs || [];
            });
        });
    };

    const downloadCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8," +
            "Title,Company,Location,Link\n" +
            currentJobs.map(job =>
                `"${job.title}","${job.company}","${job.location}","${job.link}"`
            ).join("\n");

        const link = document.createElement("a");
        link.href = encodeURI(csvContent);
        link.download = "filtered_jobs.csv";
        link.click();
    };

    const downloadJSON = () => {
        const jsonContent = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentJobs, null, 2));
        const link = document.createElement("a");
        link.href = jsonContent;
        link.download = "filtered_jobs.json";
        link.click();
    };

    saveButton.addEventListener('click', fetchJobs);
    downloadCSVButton.addEventListener('click', downloadCSV);
    downloadJSONButton.addEventListener('click', downloadJSON);
});
