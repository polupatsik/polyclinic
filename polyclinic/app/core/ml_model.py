import pickle
import os
import numpy as np

_model_data = None

# Порядок вопросов по умолчанию (используется если адаптивный режим не применим)
QUESTION_ORDER = [
    # общие/инфекционные
    "температура", "кашель", "насморк", "боль в горле", "одышка", "хрипы при дыхании",
    # неврологические/ЛОР
    "головная боль", "головокружение", "онемение конечностей", "боль в ухе", "снижение слуха",
    # общие
    "слабость",
    # кардио
    "боль в груди", "учащённое сердцебиение", "отёки ног",
    # опорно-двигательные
    "боль в спине", "боль в суставах",
    # ЖКТ
    "тошнота", "боль в животе", "изжога",
    # кожные
    "сыпь на коже", "зуд кожи", "акне", "шелушение кожи",
    # эндокринные/офтальмолог
    "повышенный сахар", "жажда и частое мочеиспускание", "нарушение зрения", "двоение в глазах",
]

TOO_MANY_SYMPTOMS_THRESHOLD = 10


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
    Адаптивный выбор следующего вопроса.

    Если пациент ответил "да" на симптом-триггер — сначала задаём
    уточняющие follow_up вопросы (пока они не заданы).
    Иначе идём по стандартной очереди QUESTION_ORDER.
    """
    model_data = get_model()
    adaptive_map = model_data.get("adaptive_follow_up", {})

    # Если ответ "да" и есть follow_up — предлагаем уточняющие вопросы
    if answer and current_symptom in adaptive_map:
        for follow_symptom in adaptive_map[current_symptom]:
            if follow_symptom not in answered:
                return follow_symptom

    # Иначе — следующий по стандартной очереди, пропуская уже заданные
    # Ищем позицию в очереди: если симптом там есть, берём следующий незаданный
    start_index = 0
    if current_symptom in QUESTION_ORDER:
        start_index = QUESTION_ORDER.index(current_symptom) + 1

    for symptom in QUESTION_ORDER[start_index:]:
        if symptom not in answered:
            return symptom

    return None


def _build_feature_vector(symptom_answers: dict, symptoms: list, symptom_weights: dict) -> list:
    """Строит взвешенный вектор признаков из ответов пациента."""
    vector = [0.0] * len(symptoms)
    for symptom_name, answer in symptom_answers.items():
        if symptom_name in symptoms and answer:
            idx = symptoms.index(symptom_name)
            vector[idx] = symptom_weights.get(symptom_name, 1.0)
    return vector


def predict_specialization(symptom_answers: dict) -> tuple[str, float]:
    """
    Принимает словарь {symptom_name: bool} и возвращает
    (специализация, уверенность от 0.0 до 1.0).

    Уверенность откалибрована через CalibratedClassifierCV —
    значение 0.72 действительно означает ~72% вероятности.
    """
    model_data = get_model()
    clf             = model_data["classifier"]
    symptoms        = model_data["symptoms"]
    specializations = model_data["specializations"]
    symptom_weights = model_data.get("symptom_weights", {s: 1.0 for s in symptoms})

    symptom_vector = _build_feature_vector(symptom_answers, symptoms, symptom_weights)

    # Нет симптомов — терапевт
    if not any(symptom_vector):
        return "Терапевт", 1.0

    # Слишком много симптомов — первичный осмотр у терапевта
    raw_count = sum(1 for name, ans in symptom_answers.items() if ans)
    if raw_count >= TOO_MANY_SYMPTOMS_THRESHOLD:
        return "Терапевт", 1.0

    features_array = np.array(symptom_vector).reshape(1, -1)
    prediction     = clf.predict(features_array)[0]
    probabilities  = clf.predict_proba(features_array)[0]

    confidence = float(probabilities[prediction])
    spec       = specializations[prediction]

    # Если уверенность низкая — не рискуем, отправляем к терапевту
    if confidence < 0.40:
        return "Терапевт", confidence

    return spec, confidence
