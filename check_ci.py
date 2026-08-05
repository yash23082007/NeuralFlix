import urllib.request
import json
import sys

r = urllib.request.urlopen('https://api.github.com/repos/yash23082007/NeuralFlix/actions/runs?per_page=1')
data = json.loads(r.read())
run = data.get('workflow_runs', [{}])[0]
r2 = urllib.request.urlopen(run['jobs_url'])
jobs = json.loads(r2.read()).get('jobs', [])

for j in jobs:
    if j['conclusion'] == 'failure':
        print(f"--- Job {j['name']} Logs ---")
        try:
            # Need auth to fetch raw logs from github actions usually, but we can look at step status
            for step in j['steps']:
                if step['conclusion'] == 'failure':
                    print(f"Step '{step['name']}' failed.")
        except Exception as e:
            print(f"Could not get step details: {e}")
