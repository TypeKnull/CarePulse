import urllib.request
import json

def test():
    url = "http://127.0.0.1:5000/api/predict/diabetes"
    payload = {
        "age": 44,
        "bmi": 26.4,
        "fastingGlucose": 108,
        "systolicBp": 128,
        "physicalActivityDays": 3.5,
        "familyHistory": True
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("LIVE_API_SMOKE_TEST_RESULT:")
        print(json.dumps(res, indent=2))

if __name__ == '__main__':
    test()
