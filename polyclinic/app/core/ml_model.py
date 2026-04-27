import pickle
import os
import numpy as np

_model_data = None

# Дерево маршрутов по НАЗВАНИЮ симптома — не зависит от ID в БД
# symptom_name → {True: next_symptom_name, False: next_symptom_name}
# None = завершить опрос
SYMPTOM_TREE = {
    "температура":      {True:  "кашель",        False: "головная боль"},
    "кашель":           {True:  "насморк",        False: "одышка"},
    "насморк":          {True:  "боль в горле",   False: "слабость"},
    "боль в горле":     {True:  None,             False: None},
    "одышка":           {True:  None,             False: None},
    "слабость":         {True:  None,             False: "тошнота"},
    "тошнота":          {True:  "боль в животе",  False: None},
    "боль в животе":    {True:  None,             False: None},
    "головная боль":    {True:  "слабость",       False: "боль в груди"},
    "боль в груди":     {True:  None,             False: "сыпь на коже"},
    "сыпь на коже":     {True:  None,             False: "повышенный сахар"},
    "повышенный сахар": {True:  None,             False: "нарушение зрения"},
    "нарушение зрения": {True:  None,             False: "боль в спине"},
    "боль в спине":     {True:  None,             False: None},
}

INITIAL_SYMPTOM = "температура"


def load_model():
    global _model_data
    model_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../models_store/classifier.pkl")
    )
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Файл модели не найден: {model_path}")
    with open(model_path, "rb") as f:
        _model_data = pickle.load(f)


def get_model():
    global _model_data
    if _model_data is None:
        load_model()
    return _model_data


def get_initial_symptom() -> str:
    return INITIAL_SYMPTOM


def get_next_symptom(current_symptom: str, answer: bool) -> str | None:
    return SYMPTOM_TREE.get(current_symptom, {}).get(answer)


def should_finish(answered_symptoms: set) -> bool:
    for symptom, branches in SYMPTOM_TREE.items():
        if symptom not in answered_symptoms:
            # проверяем достижим ли этот симптом из уже отвеченных
            continue
        for ans, next_sym in branches.items():
            if next_sym and next_sym not in answered_symptoms:
                return False
    return True


def predict_specialization(symptom_answers: dict) -> tuple[str, float]:
    """symptom_answers: {symptom_name: bool}"""
    model_data = get_model()
    clf = model_data["classifier"]
    symptoms = model_data["symptoms"]
    specializations = model_data["specializations"]

    symptom_vector = [0] * len(symptoms)
    for symptom_name, answer in symptom_answers.items():
        if symptom_name in symptoms and answer:
            symptom_vector[symptoms.index(symptom_name)] = 1

    if not any(symptom_vector):
        return "Терапевт", 1.0

    features_array = np.array(symptom_vector).reshape(1, -1)
    prediction = clf.predict(features_array)[0]
    probabilities = clf.predict_proba(features_array)[0]

    return specializations[prediction], float(probabilities[prediction])
