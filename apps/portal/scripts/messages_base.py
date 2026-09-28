import json, os
ROOT = os.path.join(os.path.dirname(__file__), "..", "messages")

def write(ns, en, id_):
    for loc, data in (("en", en), ("id", id_)):
        path = os.path.join(ROOT, loc, f"{ns}.json")
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

def check_same_keys(a, b, prefix=""):
    missing = []
    for k in a:
        if k not in b:
            missing.append(prefix + k)
        elif isinstance(a[k], dict):
            missing += check_same_keys(a[k], b[k], prefix + k + ".")
    return missing
