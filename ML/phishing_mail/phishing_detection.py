import pandas as pd
import pickle
import time
import re
from pathlib import Path
import shap

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics import classification_report, accuracy_score

BASE_DIR = Path(__file__).resolve().parent

# ----------------------------
# 1. Load Dataset
# ----------------------------

df = pd.read_csv(BASE_DIR / "phishing_email.csv")
df = df.dropna()

X = df["text_combined"].str.lower()
y = df["label"]

# ----------------------------
# 2. Feature Extraction
# ----------------------------

vectorizer = TfidfVectorizer(
    stop_words="english",
    ngram_range=(1,2),
    max_features=20000
)

X_vec = vectorizer.fit_transform(X)

# ----------------------------
# 3. Train/Test Split
# ----------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X_vec,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ----------------------------
# Random Forest Optimization
# ----------------------------

rf_train_size = min(20000, X_train.shape[0])

if rf_train_size < X_train.shape[0]:
    rf_indices, _ = train_test_split(
        range(X_train.shape[0]),
        train_size=rf_train_size,
        random_state=42,
        stratify=y_train
    )
else:
    rf_indices = list(range(X_train.shape[0]))

X_train_rf_sparse = X_train[rf_indices]
y_train_rf = y_train.iloc[rf_indices]

svd_components = min(300, X_train_rf_sparse.shape[1]-1)

svd = TruncatedSVD(
    n_components=svd_components,
    random_state=42
)

X_train_rf = svd.fit_transform(X_train_rf_sparse)
X_test_rf = svd.transform(X_test)

# ----------------------------
# 4. Define Models
# ----------------------------

models = {

    "Naive Bayes": {
        "model": MultinomialNB(),
        "train_X": X_train,
        "test_X": X_test
    },

    "Logistic Regression": {
        "model": LogisticRegression(max_iter=1000),
        "train_X": X_train,
        "test_X": X_test
    },

    "Random Forest": {
        "model": RandomForestClassifier(
            n_estimators=50,
            random_state=42,
            n_jobs=1,
            max_depth=20,
            min_samples_split=5
        ),
        "train_X": X_train_rf,
        "test_X": X_test_rf
    }
}

results = {}
trained_models = {}

# ----------------------------
# 5. Train and Evaluate
# ----------------------------

for name, config in models.items():

    model = config["model"]
    train_X = config["train_X"]
    test_X = config["test_X"]

    print(f"\nTraining {name}...")
    start = time.time()

    model.fit(train_X, y_train if name!="Random Forest" else y_train_rf)

    print(f"{name} training completed in {time.time()-start:.2f} seconds.")

    y_pred = model.predict(test_X)

    acc = accuracy_score(y_test, y_pred)

    report = classification_report(y_test, y_pred, output_dict=True)

    results[name] = {
        "accuracy": acc,
        "precision": report["weighted avg"]["precision"],
        "recall": report["weighted avg"]["recall"],
        "f1-score": report["weighted avg"]["f1-score"]
    }

    trained_models[name] = model

    print("\nClassification Report\n")
    print(classification_report(y_test, y_pred))

# ----------------------------
# 6. Model Comparison
# ----------------------------

print("\nModel Comparison Results\n")

for name, metrics in results.items():

    print(
        f"{name}: "
        f"Accuracy={metrics['accuracy']:.4f} "
        f"Precision={metrics['precision']:.4f} "
        f"Recall={metrics['recall']:.4f} "
        f"F1={metrics['f1-score']:.4f}"
    )

# ----------------------------
# 7. Select Best Model
# ----------------------------

best_model_name = max(results, key=lambda x: results[x]["accuracy"])
best_model = trained_models[best_model_name]

print(f"\nBest performing model: {best_model_name}")

# ----------------------------
# 8. Save Model
# ----------------------------

pickle.dump(best_model, open(BASE_DIR/"phishing_model.pkl","wb"))
pickle.dump(vectorizer, open(BASE_DIR/"vectorizer.pkl","wb"))

print("\nModel and vectorizer saved.")

# ----------------------------
# 9. SHAP Explainer
# ----------------------------

background_size = min(100, X_train.shape[0])
background_data = X_train[:background_size]

feature_names = vectorizer.get_feature_names_out()

if best_model_name == "Random Forest":
    explainer = shap.TreeExplainer(best_model)

elif best_model_name == "Logistic Regression":
    explainer = shap.LinearExplainer(best_model, background_data)

else:
    explainer = shap.Explainer(best_model.predict_proba, background_data.toarray())

# ----------------------------
# Ignore Neutral Words
# ----------------------------

IGNORE_WORDS = {
    "dear","hello","hi","thanks","thank",
    "regards","please","user","sir","madam"
}

IGNORE_PHRASE_PREFIXES = {"dear", "hello", "hi"}


def should_ignore_indicator(term):

    tokens = term.split()

    if not tokens:
        return True

    if all(token in IGNORE_WORDS for token in tokens):
        return True

    if tokens[0] in IGNORE_PHRASE_PREFIXES:
        return True

    return len(term.replace(" ", "")) <= 3

# ----------------------------
# Highlight Function
# ----------------------------

def highlight_suspicious_words(email_text, suspicious_words):

    highlighted_text = email_text

    for word in suspicious_words:

        highlighted_text = re.sub(
            r'\b' + re.escape(word) + r'\b',
            f"**{word.upper()}**",
            highlighted_text,
            flags=re.IGNORECASE
        )

    return highlighted_text

# ----------------------------
# Prediction Function
# ----------------------------

def predict_email(email_text):

    original_email = email_text
    email_text = email_text.lower()

    email_vec = vectorizer.transform([email_text])

    if best_model_name == "Random Forest":

        email_features = svd.transform(email_vec)
        score = best_model.predict_proba(email_features)[0][1]

    else:

        email_features = email_vec
        score = best_model.predict_proba(email_features)[0][1]

    # Risk levels

    if score < 0.3:
        risk = "LOW RISK"

    elif score < 0.7:
        risk = "MEDIUM RISK"

    else:
        risk = "HIGH RISK"

    # Explainability

    if best_model_name == "Random Forest":

        suspicious_words = ["svd_feature"]

    else:

        explain_input = (
            email_features
            if best_model_name == "Logistic Regression"
            else email_features.toarray()
        )

        shap_values = explainer(explain_input)

        if best_model_name == "Logistic Regression":
            values = shap_values.values[0]
        else:
            values = shap_values.values[0,:,1]

        sorted_indices = values.argsort()[::-1]

        suspicious_words = []

        for i in sorted_indices:

            word = feature_names[i]

            if not should_ignore_indicator(word):
                suspicious_words.append(word)

            if len(suspicious_words) == 5:
                break

    highlighted_email = highlight_suspicious_words(
        original_email,
        suspicious_words
    )

    return score, risk, suspicious_words, highlighted_email


# ----------------------------
# Test Example
# ----------------------------

test_email = """
Dear user,

Your account has been compromised.
Click the link below to verify your password immediately.
"""

score, risk, words, highlighted_email = predict_email(test_email)

print("\nPrediction Result")
print("Phishing Score:", round(score,3))
print("Risk Level:", risk)

print("\nTop Suspicious Indicators:")

for w in words:
    print("-", w)

print("\nHighlighted Email:\n")
print(highlighted_email)
