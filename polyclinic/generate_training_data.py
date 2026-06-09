import json
import random
import os

random.seed(42)

SYMPTOMS = [
    "кашель", "температура", "головная боль", "насморк", "боль в горле",
    "слабость", "тошнота", "боль в груди", "сыпь на коже", "повышенный сахар",
    "нарушение зрения", "боль в животе", "боль в спине", "одышка", "зуд кожи",
    "акне", "шелушение кожи", "боль в ухе", "снижение слуха", "головокружение",
    "онемение конечностей", "изжога", "учащённое сердцебиение", "отёки ног",
    "жажда и частое мочеиспускание", "двоение в глазах", "боль в суставах",
    "хрипы при дыхании",
]

# Вероятности появления симптома вместо жёсткого vector[idx] = 1
# Реальные пациенты не всегда называют даже ключевые симптомы
CORE_PROB     = 0.85
LIKELY_PROB   = 0.60
POSSIBLE_PROB = 0.30

# Шум: имитирует "грязные" данные — пациент забыл/преувеличил/перепутал
NOISE_PROB = 0.06

SPECIALIZATION_PROFILES = {
    "ЛОР":             {"core": [3,4,17],    "likely": [0,1,18,19], "possible": [5,2]},
    "Пульмонолог":     {"core": [0,13,27],   "likely": [1,5,7],     "possible": [2,6]},
    "Терапевт":        {"core": [1,5],       "likely": [0,2,3],     "possible": [6,4]},
    "Невролог":        {"core": [2,19,20],   "likely": [5,6],       "possible": [1,12]},
    "Гастроэнтеролог": {"core": [6,11,21],   "likely": [5,1],       "possible": [2,7]},
    "Кардиолог":       {"core": [7,22,23],   "likely": [13,5],      "possible": [6,1]},
    "Дерматолог":      {"core": [8,14,16],   "likely": [15,1],      "possible": [5,6]},
    "Эндокринолог":    {"core": [9,24,23],   "likely": [5,10],      "possible": [2,1]},
    "Офтальмолог":     {"core": [10,25],     "likely": [2,6],       "possible": [5,19]},
    "Ортопед":         {"core": [12,26,20],  "likely": [5,2],       "possible": [13,6]},
}

RECORDS_PER_SPEC = 300  # было 150 — больше данных, лучше калибровка


def generate_record(spec):
    profile = SPECIALIZATION_PROFILES[spec]
    vector = [0] * len(SYMPTOMS)

    for idx in profile["core"]:
        if random.random() < CORE_PROB:
            vector[idx] = 1

    for idx in profile["likely"]:
        if random.random() < LIKELY_PROB:
            vector[idx] = 1

    for idx in profile["possible"]:
        if random.random() < POSSIBLE_PROB:
            vector[idx] = 1

    # Добавляем шум — инвертируем случайные биты
    for i in range(len(vector)):
        if random.random() < NOISE_PROB:
            vector[i] = 1 - vector[i]

    return {"symptoms": vector, "specialization": spec}


def main():
    print("Генерация обучающих данных...")
    all_data = []
    for spec in SPECIALIZATION_PROFILES:
        records = [generate_record(spec) for _ in range(RECORDS_PER_SPEC)]
        all_data.extend(records)
        avg = sum(sum(r["symptoms"]) for r in records) / len(records)
        print(f"  {spec:<20} {len(records)} записей, среднее симптомов: {avg:.1f}")

    random.shuffle(all_data)
    print(f"\nИтого: {len(all_data)} записей, симптомов в векторе: {len(SYMPTOMS)}")

    os.makedirs("models_store", exist_ok=True)
    out_path = "models_store/training_data.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"Сохранено в {out_path}")


if __name__ == "__main__":
    main()