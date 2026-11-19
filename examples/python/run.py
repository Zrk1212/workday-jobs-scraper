"""Scrape every job from a Workday career site (myworkdayjobs.com), past the 2,000-result cap.

Usage:
    export APIFY_TOKEN=your_token        # https://console.apify.com/settings/integrations
    pip install -r requirements.txt
    python examples/python/run.py
    python examples/python/run.py https://target.wd5.myworkdayjobs.com/targetcareers 50

Arguments (both optional):
    1. Workday career site URL (default: NVIDIA)
    2. Max jobs to fetch (default: 25, use 0 for all jobs)

Writes the jobs to workday_jobs.csv in the current folder.
"""

import csv
import json
import os
import sys

from apify_client import ApifyClient

ACTOR_ID = "zrk1212/workday-jobs-scraper"

site_url = sys.argv[1] if len(sys.argv) > 1 else "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite"
max_jobs = int(sys.argv[2]) if len(sys.argv) > 2 else 25

run_input = {
    "siteUrls": [site_url],
    # You can also pass company names and let the actor find the career site:
    # "companies": ["Salesforce", "Intel"],
    "searchText": "",
    "titleKeywords": [],          # e.g. ["engineer", "manager"]
    "locationKeywords": [],       # e.g. ["Texas", "Remote"]
    "postedWithinDays": 0,        # 0 = no limit
    "maxResultsPerSite": max_jobs,
    "includeDetails": True,       # description, salary, posted date, all locations
    "completeResults": True,      # split searches to get past the 2,000 cap
}

token = os.environ.get("APIFY_TOKEN")
if not token:
    sys.exit("Set the APIFY_TOKEN environment variable first.")

client = ApifyClient(token)
print(f"Running {ACTOR_ID} on {site_url} ...")
run = client.actor(ACTOR_ID).call(run_input=run_input)
if run is None:
    sys.exit("The run did not start.")
print(f"Run {run.id} finished with status {run.status}")

jobs = list(client.dataset(run.default_dataset_id).iterate_items())
print(f"Got {len(jobs)} jobs\n")

for job in jobs[:10]:
    salary = ""
    if job.get("salaryMin"):
        salary = f"  {job['salaryMin']}-{job.get('salaryMax')} {job.get('salaryCurrency') or ''}"
    print(f"- {job.get('title')} | {job.get('location')} | {job.get('postedDate')}{salary}")

columns = [
    "company", "title", "jobReqId", "jobCategory", "location", "country", "isRemote",
    "timeType", "postedDate", "salaryMin", "salaryMax", "salaryCurrency", "salaryPeriod", "url",
]
with open("workday_jobs.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for job in jobs:
        writer.writerow({k: (json.dumps(v) if isinstance(v, (list, dict)) else v) for k, v in job.items()})
print("\nSaved workday_jobs.csv")
