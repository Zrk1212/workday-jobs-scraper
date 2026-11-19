// Scrape every job from a Workday career site (myworkdayjobs.com), past the 2,000-result cap.
//
// Usage:
//   export APIFY_TOKEN=your_token      # https://console.apify.com/settings/integrations
//   npm install
//   node examples/node/run.mjs
//   node examples/node/run.mjs https://target.wd5.myworkdayjobs.com/targetcareers 50
//
// Arguments (both optional): Workday career site URL, max jobs (0 = all jobs).
// Writes workday_jobs.csv in the current folder.

import { writeFileSync } from 'node:fs';
import { ApifyClient } from 'apify-client';

const ACTOR_ID = 'zrk1212/workday-jobs-scraper';
const siteUrl = process.argv[2] ?? 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite';
const maxJobs = Number(process.argv[3] ?? 25);

if (!process.env.APIFY_TOKEN) {
    console.error('Set the APIFY_TOKEN environment variable first.');
    process.exit(1);
}

const input = {
    siteUrls: [siteUrl],
    // companies: ['Salesforce', 'Intel'],   // or let the actor find the career site by name
    searchText: '',
    titleKeywords: [],        // e.g. ['engineer', 'manager']
    locationKeywords: [],     // e.g. ['Texas', 'Remote']
    postedWithinDays: 0,      // 0 = no limit
    maxResultsPerSite: maxJobs,
    includeDetails: true,     // description, salary, posted date, all locations
    completeResults: true,    // split searches to get past the 2,000 cap
};

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
console.log(`Running ${ACTOR_ID} on ${siteUrl} ...`);
const run = await client.actor(ACTOR_ID).call(input);
console.log(`Run ${run.id} finished with status ${run.status}`);

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(`Got ${items.length} jobs\n`);
for (const job of items.slice(0, 10)) {
    const salary = job.salaryMin ? `  ${job.salaryMin}-${job.salaryMax} ${job.salaryCurrency ?? ''}` : '';
    console.log(`- ${job.title} | ${job.location} | ${job.postedDate}${salary}`);
}

const columns = ['company', 'title', 'jobReqId', 'jobCategory', 'location', 'country', 'isRemote',
    'timeType', 'postedDate', 'salaryMin', 'salaryMax', 'salaryCurrency', 'salaryPeriod', 'url'];
writeFileSync('workday_jobs.csv', toCsv(items, columns));
console.log('\nSaved workday_jobs.csv');

function toCsv(rows, cols) {
    const cell = (v) => {
        if (v === null || v === undefined) return '';
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}
