import json
import math
import pickle
import sys
import warnings
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
ML_DIR = BASE_DIR / "ML" / "phishing_mail"
MODEL_PATH = ML_DIR / "phishing_model.pkl"
VECTORIZER_PATH = ML_DIR / "vectorizer.pkl"


def load_artifacts():
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with MODEL_PATH.open("rb") as model_file:
            model = pickle.load(model_file)
        with VECTORIZER_PATH.open("rb") as vectorizer_file:
            vectorizer = pickle.load(vectorizer_file)

    if not hasattr(model, "multi_class"):
        model.multi_class = "auto"

    return model, vectorizer


MODEL, VECTORIZER = load_artifacts()


def combine_email_text(payload):
    attachments = payload.get("attachments") or []
    attachment_names = " ".join(
        item.get("filename", "") for item in attachments if item.get("filename")
    )
    links = " ".join(payload.get("links") or [])

    parts = [
        payload.get("subject", ""),
        payload.get("sender", ""),
        payload.get("body", ""),
        links,
        attachment_names,
    ]

    return "\n".join(part.strip() for part in parts if isinstance(part, str) and part.strip())


def infer_probability(features):
    try:
        probabilities = MODEL.predict_proba(features)[0]
        phishing_index = list(MODEL.classes_).index(1) if 1 in MODEL.classes_ else len(probabilities) - 1
        return float(probabilities[phishing_index])
    except Exception:
        decision = float(MODEL.decision_function(features)[0])
        return 1.0 / (1.0 + math.exp(-decision))


def build_explanation(features):
    if not hasattr(MODEL, "coef_"):
        return []

    feature_names = VECTORIZER.get_feature_names_out()
    row = features.tocoo()
    active_features = []

    for index, value in zip(row.col, row.data):
        weight = float(MODEL.coef_[0][index]) * float(value)
        if weight <= 0:
            continue
        active_features.append((weight, feature_names[index]))

    active_features.sort(reverse=True)

    explanation = []
    seen = set()
    for _, term in active_features:
        if term in seen:
            continue
        explanation.append(term)
        seen.add(term)
        if len(explanation) == 5:
            break

    return explanation


def main():
    raw_payload = sys.argv[1] if len(sys.argv) > 1 else "{}"
    payload = json.loads(raw_payload or "{}")
    email_text = combine_email_text(payload).lower()
    features = VECTORIZER.transform([email_text])
    predicted_class = int(MODEL.predict(features)[0])
    phishing_probability = infer_probability(features)
    explanation = build_explanation(features)

    label = "phishing" if predicted_class == 1 else "safe"

    result = {
        "scam_probability": round(phishing_probability, 6),
        "label": label,
        "explanation": explanation,
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()
