import pickle
import os
import numpy as np

_model_data = None

#Все 28 симптомов задаются последовательно.
#классификатор получает полный вектор и выдаёт честную вероятность.
QUESTION_ORDER = [
    #общие/инфекционные
    "температура",
    "кашель",
    "насморк",
    "боль в горле",
    "одышка",
    "хрипы при дыхании",
    #неврологические/ЛОР
    "головная боль",
    "головокружение",
    "онемение конечностей",
    "боль в ухе",
    "снижение слуха",
    #общие
    "слабость",
    #кардио
    "боль в груди",
    "учащённое сердцебиение",
    "отёки ног",
    #опорно-двигательные
    "боль в спине",
    "боль в суставах",
    #ЖКТ
    "тошнота",
    "боль в животе",
    "изжога",
    #кожные
    "сыпь на коже",
    "зуд кожи",
    "акне",
    "шелушение кожи",
    #эндокринные/офтальмо
    "повышенный сахар",
    "жажда и частое мочеиспускание",
    "нарушение зрения",
    "двоение в глазах",
]


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
    return QUESTION_ORDER[0]


def get_next_symptom(current_symptom: str, answer: bool, answered: set) -> str | None:
    """
    Возвращает следующий симптом из фиксированной очереди.
    answer и answered игнорируются — вопросы идут строго по порядку.
    """
    if current_symptom not in QUESTION_ORDER:
        return None
    current_index = QUESTION_ORDER.index(current_symptom)
    next_index = current_index + 1
    if next_index >= len(QUESTION_ORDER):
        return None
    return QUESTION_ORDER[next_index]


def predict_specialization(symptom_answers: dict) -> tuple[str, float]:
    """
    Принимает словарь {symptom_name: bool} и возвращает
    (специализация, уверенность от 0.0 до 1.0).
    """
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