import json


def display(data, as_json=False):
    if as_json:
        print(json.dumps(data, indent=2, default=str))
        return
    if isinstance(data, dict) and "items" in data:
        data = data["items"]
    if isinstance(data, list):
        if not data:
            print("No results.")
        for item in data:
            display(item)
    elif isinstance(data, dict):
        for key, value in data.items():
            if not isinstance(value, (list, dict)):
                print(f"{key}: {value}")
    else:
        print(data)
