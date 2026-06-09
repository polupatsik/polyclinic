import numpy as np
import pickle
import json
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.calibration import CalibratedClassifierCV

SYMPTOMS = [
    "кашель", "температура", "головная боль", "насморк", "боль в горле",
    "слабость", "тошнота", "боль в груди", "сыпь на коже", "повышенный сахар",
    "нарушение зрения", "боль в животе", "боль в спине", "одышка", "зуд кожи",
    "акне", "шелушение кожи", "боль в ухе", "снижение слуха", "головокружение",
    "онемение конечностей", "изжога", "учащённое сердцебиение", "отёки ног",
    "жажда и частое мочеиспускание", "двоение в глазах", "боль в суставах",
    "хрипы при дыхании",
]

SPECIALIZATIONS = [
    "Терапевт", "ЛОР", "Невролог", "Гастроэнтеролог", "Кардиолог",
    "Дерматолог", "Эндокринолог", "Офтальмолог", "Ортопед", "Пульмонолог",
]

QUESTION_SYMPTOM_MAP = {i+1: s for i, s in enumerate(SYMPTOMS)}
INITIAL_QUESTION_ID = 2

# Веса симптомов — редкий специфичный симптом весит больше общего
# Используется в ml_model.py для взвешенного вектора
SYMPTOM_WEIGHTS = {
    "кашель":                       0.6,
    "температура":                  0.5,
    "головная боль":                0.6,
    "насморк":                      0.7,
    "боль в горле":                 0.8,
    "слабость":                     0.3,   # слишком общий
    "тошнота":                      0.7,
    "боль в груди":                 0.9,
    "сыпь на коже":                 1.0,
    "повышенный сахар":             1.0,
    "нарушение зрения":             1.0,
    "боль в животе":                0.8,
    "боль в спине":                 0.8,
    "одышка":                       0.9,
    "зуд кожи":                     0.9,
    "акне":                         0.9,
    "шелушение кожи":               1.0,
    "боль в ухе":                   1.0,
    "снижение слуха":               1.0,
    "головокружение":               0.7,
    "онемение конечностей":         1.0,
    "изжога":                       1.0,
    "учащённое сердцебиение":       1.0,
    "отёки ног":                    0.9,
    "жажда и частое мочеиспускание":1.0,
    "двоение в глазах":             1.0,
    "боль в суставах":              1.0,
    "хрипы при дыхании":            1.0,
}

# Адаптивные вопросы: если пациент ответил "да" на trigger-симптом,
# следующими задаём уточняющие вопросы из follow_up (в приоритете)
ADAPTIVE_FOLLOW_UP = {
    "кашель":        ["одышка", "хрипы при дыхании", "боль в груди"],
    "температура":   ["кашель", "боль в горле", "насморк"],
    "боль в груди":  ["учащённое сердцебиение", "одышка", "отёки ног"],
    "головная боль": ["головокружение", "онемение конечностей", "нарушение зрения"],
    "тошнота":       ["боль в животе", "изжога"],
    "сыпь на коже":  ["зуд кожи", "шелушение кожи", "акне"],
    "боль в спине":  ["боль в суставах", "онемение конечностей"],
}


def load_training_data():
    data_path = "models_store/training_data.json"
    if not os.path.exists(data_path):
        raise FileNotFoundError("Сначала запусти generate_training_data.py")
    with open(data_path, encoding="utf-8") as f:
        raw = json.load(f)

    X, y = [], []
    for item in raw:
        if isinstance(item, str):
            continue
        symptoms_vec = item.get("symptoms")
        spec = item.get("specialization")
        if not symptoms_vec or not spec or spec not in SPECIALIZATIONS:
            continue
        if len(symptoms_vec) != len(SYMPTOMS):
            continue
        # Взвешиваем вектор при обучении
        weights = [SYMPTOM_WEIGHTS.get(s, 1.0) for s in SYMPTOMS]
        weighted = [v * w for v, w in zip(symptoms_vec, weights)]
        X.append(weighted)
        y.append(SPECIALIZATIONS.index(spec))

    return np.array(X), np.array(y)


X, y = load_training_data()
print(f"Загружено {len(X)} записей")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Базовый RandomForest
base_clf = RandomForestClassifier(
    n_estimators=300,
    max_depth=12,
    min_samples_leaf=3,
    class_weight="balanced",
    random_state=42,
)

# CalibratedClassifierCV — исправляет "фейковые" вероятности RandomForest
# method="isotonic" лучше для больших датасетов, "sigmoid" для маленьких
clf = CalibratedClassifierCV(base_clf, method="isotonic", cv=5)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"Точность модели: {accuracy:.2%}")
print(classification_report(y_test, y_pred, target_names=SPECIALIZATIONS))

os.makedirs("models_store", exist_ok=True)
model_data = {
    "classifier": clf,
    "symptoms": SYMPTOMS,
    "specializations": SPECIALIZATIONS,
    "accuracy": float(accuracy),
    "question_symptom_map": QUESTION_SYMPTOM_MAP,
    "initial_question_id": INITIAL_QUESTION_ID,
    "symptom_weights": SYMPTOM_WEIGHTS,
    "adaptive_follow_up": ADAPTIVE_FOLLOW_UP,
}
with open("models_store/classifier.pkl", "wb") as f:
    pickle.dump(model_data, f)

print("Модель сохранена в models_store/classifier.pkl")