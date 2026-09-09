import json, os, urllib.request

token = os.environ["TODOIST_API_TOKEN"]
req = urllib.request.Request(
    "https://api.todoist.com/api/v1/tasks",
    headers={"Authorization": f"Bearer {token}"},
)
with urllib.request.urlopen(req, timeout=30) as resp:
    data = json.loads(resp.read().decode("utf-8"))
all_tasks = data.get("results", data if isinstance(data, list) else [])
proj = "6h7MGc7cVFgMGWV9"
incomplete = [t for t in all_tasks if t.get("project_id") == proj and not t.get("completed")]
# include section data
for t in incomplete:
    t["section_id"] = t.get("section_id")
    t["section_name"] = t.get("section_name")
print(json.dumps({"count": len(incomplete), "tasks": incomplete}, indent=2))
