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


def predict_specialization(symptom_names: list[str], duration_days: int) -> tuple[str, float]:
    model_data = get_model()
    clf = model_data["classifier"]
    symptoms = model_data["symptoms"]
    specializations = model_data["specializations"]

    features = [1 if s in symptom_names else 0 for s in symptoms]
    features_array = np.array(features).reshape(1, -1)

    prediction = clf.predict(features_array)[0]
    probabilities = clf.predict_proba(features_array)[0]
    confidence = float(probabilities[prediction])

    return specializations[prediction], confidence