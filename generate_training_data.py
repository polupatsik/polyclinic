import os
import json
import time
import requests

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYMPTOMS = [
    "кашель",           # 1  вопрос id=1
    "температура",      # 2  вопрос id=2
    "головная боль",    # 3  вопрос id=3
    "насморк",          # 4  вопрос id=4
    "боль в горле",     # 5  вопрос id=5
    "слабость",         # 6  вопрос id=6
    "тошнота",          # 7  вопрос id=7
    "боль в груди",     # 8  вопрос id=8
    "сыпь на коже",     # 9  вопрос id=9
    "повышенный сахар", # 10 вопрос id=10
    "нарушение зрения", # 11 вопрос id=11
    "боль в животе",    # 12 вопрос id=12
    "боль в спине",     # 13 вопрос id=13
    "одышка",           # 14 вопрос id=14
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

SYMPTOM_LIST = ", ".join(f"{i+1}) {s}" for i, s in enumerate(SYMPTOMS))
SPEC_LIST = ", ".join(SPECIALIZATIONS)

PROMPT_TEMPLATE = """Ты медицинский эксперт. Сгенерируй {n} записей обучающих данных для классификатора симптомов.

Симптомы (индексы 0-13 в порядке):
{symptoms}

Специализации: {specializations}

Медицинские правила соответствия:
- кашель + насморк + боль в горле → ЛОР
- кашель + одышка → Пульмонолог
- головная боль + слабость → Невролог
- тошнота + боль в животе → Гастроэнтеролог
- температура + слабость → Терапевт
- боль в груди → Кардиолог
- сыпь на коже → Дерматолог
- повышенный сахар → Эндокринолог
- нарушение зрения → Офтальмолог
- боль в спине → Ортопед

Верни ТОЛЬКО валидный JSON массив без пояснений, markdown и текста:
[{{"symptoms": [1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], "specialization": "Невролог"}}]

Вектор симптомов всегда содержит ровно 14 значений (0 или 1).
Сгенерируй ровно {n} записей с разнообразными комбинациями для каждого специалиста."""


def generate_batch(n: int) -> list:
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "user", "content": PROMPT_TEMPLATE.format(
                n=n,
                symptoms=SYMPTOM_LIST,
                specializations=SPEC_LIST,
            )}
        ],
        "temperature": 0.7,
        "max_tokens": 8192,
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    response = requests.post(GROQ_URL, json=payload, headers=headers)
    response.raise_for_status()

    text = response.json()["choices"][0]["message"]["content"].strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    return json.loads(text)


def main():
    print("Генерация обучающих данных через Groq API (LLaMA 3.1)...")
    all_data = []

    for i in range(5):
        print(f"Батч {i+1}/5 — генерируем 50 записей...")
        try:
            batch = generate_batch(50)
            valid = [
                item for item in batch
                if isinstance(item.get("symptoms"), list)
                and len(item["symptoms"]) == len(SYMPTOMS)
                and item.get("specialization") in SPECIALIZATIONS
            ]
            all_data.extend(valid)
            print(f"  Получено валидных: {len(valid)} из {len(batch)}")
        except Exception as e:
            print(f"  Ошибка: {e}")
        time.sleep(3)

    print(f"\nВсего сгенерировано: {len(all_data)} записей")

    os.makedirs("models_store", exist_ok=True)
    existing = []
    if os.path.exists("models_store/training_data.json"):
        with open("models_store/training_data.json", encoding="utf-8") as f:
            try:
                existing = json.load(f)
                existing = [
                    item for item in existing
                    if isinstance(item.get("symptoms"), list)
                    and len(item["symptoms"]) == len(SYMPTOMS)
                ]
            except Exception:
                existing = []

    all_data = existing + all_data

    with open("models_store/training_data.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"Итого в файле: {len(all_data)} записей")
    print("Данные сохранены в models_store/training_data.json")


if __name__ == "__main__":
    main()
