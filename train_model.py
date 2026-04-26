import numpy as np
import pickle
import json
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

SYMPTOMS = [
    "кашель",           # вопрос id=1
    "температура",      # вопрос id=2
    "головная боль",    # вопрос id=3
    "насморк",          # вопрос id=4
    "боль в горле",     # вопрос id=5
    "слабость",         # вопрос id=6
    "тошнота",          # вопрос id=7
    "боль в груди",     # вопрос id=8
    "сыпь на коже",     # вопрос id=9
    "повышенный сахар", # вопрос id=10
    "нарушение зрения", # вопрос id=11
    "боль в животе",    # вопрос id=12
    "боль в спине",     # вопрос id=13
    "одышка",           # вопрос id=14
]

SPECIALIZATIONS = [
    "Терапевт",
    "ЛОР",
    "Невролог",
    "Гастроэнтеролог",
    "Кардиолог",
    "Дерматолог",
    "Эндокринолог",
    "Офтальмолог",
    "Ортопед",
    "Пульмонолог",
]

QUESTION_SYMPTOM_MAP = {
    1:  "кашель",
    2:  "температура",
    3:  "головная боль",
    4:  "насморк",
    5:  "боль в горле",
    6:  "слабость",
    7:  "тошнота",
    8:  "боль в груди",
    9:  "сыпь на коже",
    10: "повышенный сахар",
    11: "нарушение зрения",
    12: "боль в животе",
    13: "боль в спине",
    14: "одышка",
}

# Дерево вопросов:
# Начинаем с вопроса 2 (температура) — самый общий симптом,
# охватывает все инфекционные ветки и служит хорошим разделителем.
#
# question_id → {True: next_id, False: next_id}
# None = конец ветки, переходим к predict_specialization
#
# Маршруты:
# Температура=да → кашель → (да: насморк→горло→конец | нет: одышка→конец)
# Температура=нет → голова → (да: слабость→конец | нет: боль_в_груди → сыпь → сахар → зрение → спина → тошнота→живот)

NEXT_QUESTION_RULES = {
    2:  {True: 1,    False: 3},   # температура? да→кашель, нет→голова
    1:  {True: 4,    False: 14},  # кашель? да→насморк, нет→одышка
    4:  {True: 5,    False: 6},   # насморк? да→горло, нет→слабость
    5:  {True: None, False: None},# горло? → конец
    6:  {True: None, False: None},# слабость? → конец
    14: {True: None, False: None},# одышка? → конец
    3:  {True: 6,    False: 8},   # голова? да→слабость, нет→боль_в_груди
    8:  {True: None, False: 9},   # боль в груди? да→конец, нет→сыпь
    9:  {True: None, False: 10},  # сыпь? да→конец, нет→сахар
    10: {True: None, False: 11},  # сахар? да→конец, нет→зрение
    11: {True: None, False: 13},  # зрение? да→конец, нет→спина
    13: {True: None, False: 7},   # спина? да→конец, нет→тошнота
    7:  {True: 12,   False: None},# тошнота? да→живот, нет→конец
    12: {True: None, False: None},# живот? → конец
}

INITIAL_QUESTION_ID = 2


def load_training_data():
    data_path = "models_store/training_data.json"
    if not os.path.exists(data_path):
        raise FileNotFoundError("Сначала запусти generate_training_data.py")

    with open(data_path, encoding="utf-8") as f:
        raw = json.load(f)

    if isinstance(raw, str):
        raw = json.loads(raw)

    X, y = [], []
    for item in raw:
        if isinstance(item, str):
            continue
        symptoms_vec = item.get("symptoms")
        spec = item.get("specialization")
        if not symptoms_vec or not spec:
            continue
        if spec not in SPECIALIZATIONS:
            continue
        if len(symptoms_vec) != len(SYMPTOMS):
            continue
        X.append(symptoms_vec)
        y.append(SPECIALIZATIONS.index(spec))

    return np.array(X), np.array(y)


X, y = load_training_data()
print(f"Загружено {len(X)} записей для обучения")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

clf = RandomForestClassifier(
    n_estimators=200,
    max_depth=8,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
)
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
    "next_question_rules": NEXT_QUESTION_RULES,
    "initial_question_id": INITIAL_QUESTION_ID,
}
with open("models_store/classifier.pkl", "wb") as f:
    pickle.dump(model_data, f)

print("Модель сохранена в models_store/classifier.pkl")
