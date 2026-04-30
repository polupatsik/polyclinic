import pickle
import os
import numpy as np

_model_data = None

SYMPTOM_TREE = {
    "температура":      {True: "кашель",          False: "головная боль"},
    "кашель":           {True: "насморк",          False: "одышка"},
    "насморк":          {True: "боль в горле",     False: "слабость"},
    "боль в горле":     {True: "слабость",         False: "тошнота"},
    "одышка":           {True: "слабость",         False: "боль в груди"},
    "головная боль":    {True: "слабость",         False: "боль в груди"},
    "слабость":         {True: "тошнота",          False: "боль в животе"},
    "тошнота":          {True: "боль в животе",    False: "боль в груди"},
    "боль в животе":    {True: "боль в груди",     False: "боль в спине"},
    "боль в груди":     {True: "одышка",           False: "сыпь на коже"},
    "сыпь на коже":     {True: "повышенный сахар", False: "повышенный сахар"},
    "повышенный сахар": {True: "нарушение зрения", False: "нарушение зрения"},
    "нарушение зрения": {True: "боль в спине",     False: "боль в спине"},
    "боль в спине":     {True: None,               False: None},
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


def get_next_symptom(current_symptom: str, answer: bool, answered: set) -> str | None:
    next_sym = SYMPTOM_TREE.get(current_symptom, {}).get(answer)
    if next_sym and next_sym in answered:
        return None
    return next_sym


def predict_specialization(symptom_answers: dict) -> tuple[str, float]:
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
