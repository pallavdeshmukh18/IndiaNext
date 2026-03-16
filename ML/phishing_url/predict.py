import sys
import json
import pickle
import os
import pandas as pd

from feature_extractor import FeatureExtractor

ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ROOT, 'data', 'sentinel_ultima.pkl')

def predict(url):
    try:
        if not os.path.exists(MODEL_PATH):
             print(json.dumps({"error": f"Model file not found at {MODEL_PATH}"}))
             return

        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)['model']
            
        feats = FeatureExtractor.extract_features(url, mode='offline')
        names = FeatureExtractor.get_feature_names('offline')
        
        X = pd.DataFrame([feats[:17]], columns=names)
        prob = float(model.predict_proba(X)[0][1])
        
        threat_type = 'PHISHING' if prob >= 0.5 else ('SUSPICIOUS' if prob >= 0.3 else 'LEGITIMATE')
        risk_score = min(100, max(0, int(prob * 100)))

        is_suspicious = threat_type != 'LEGITIMATE'
        if not is_suspicious and risk_score > 40:
             risk_score = 40

        explanation = []
        if is_suspicious:
            explanation.append(f"SentinEL Model Assessment P(phishing)={prob:.2f}.")
            top_n = min(3, len(names))
            for i in range(top_n):
                if i < len(feats):
                    explanation.append(f"Forensic feature '{names[i]}' = {feats[i]:.2f}.")
        else:
            explanation.append("URL appears clean based on model patterns.")

        # Print JSON response to stdout
        print(json.dumps({
            "isSuspicious": is_suspicious,
            "riskScore": risk_score,
            "threatType": 'Phishing URL' if threat_type == 'PHISHING' else ('Suspicious URL' if threat_type == 'SUSPICIOUS' else 'None'),
            "explanation": " ".join(explanation)
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        predict(sys.argv[1])
    else:
        print(json.dumps({"error": "No URL provided"}))
