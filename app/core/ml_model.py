import pickle
import os
import numpy as np

_model_data = None


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


def get_next_question_id(question_id: int, answer: bool) -> int | None:
    model_data = get_model()
    rules = model_data["next_question_rules"]
    if question_id not in rules:
        return None
    return rules[question_id][answer]


def get_initial_question_id() -> int:
    return get_model()["initial_question_id"]


def should_finish(answers: dict) -> bool:
    model_data = get_model()
    rules = model_data["next_question_rules"]
    last_question_id = max(answers.keys())
    next_id = rules.get(last_question_id, {}).get(answers[last_question_id])
    if next_id is None:
        return True
    if next_id in answers:
        return True
    has_positive = any(v for v in answers.values())
    return has_positive and len(answers) >= 5


def predict_specialization(answers: dict) -> tuple[str, float]:
    model_data = get_model()
    clf = model_data["classifier"]
    symptoms = model_data["symptoms"]
    specializations = model_data["specializations"]
    question_symptom_map = model_data["question_symptom_map"]

    symptom_vector = [0] * len(symptoms)
    for question_id, answer in answers.items():
        symptom_name = question_symptom_map.get(int(question_id))
        if symptom_name and answer:
            idx = symptoms.index(symptom_name)
            symptom_vector[idx] = 1

    has_positive = any(v == 1 for v in symptom_vector)
    if not has_positive:
        return "Терапевт", 1.0

    features_array = np.array(symptom_vector).reshape(1, -1)
    prediction = clf.predict(features_array)[0]
    probabilities = clf.predict_proba(features_array)[0]
    confidence = float(probabilities[prediction])

    return specializations[prediction], confidence
