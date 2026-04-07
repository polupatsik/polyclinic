import os
import json
import time
import requests

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYMPTOMS = [
    "кашель", "температура", "головная боль",
    "насморк", "боль в горле", "слабость", "тошнота",
]

SPECIALIZATIONS = ["Терапевт", "ЛОР", "Невролог", "Гастроэнтеролог"]

PROMPT_TEMPLATE = """Ты медицинский эксперт. Сгенерируй {n} записей обучающих данных для классификатора симптомов.

Симптомы (в порядке): кашель, температура, головная боль, насморк, боль в горле, слабость, тошнота
Специализации: Терапевт, ЛОР, Невролог, Гастроэнтеролог

Правила:
- Кашель + насморк + боль в горле → ЛОР
- Головная боль + слабость → Невролог
- Тошнота → Гастроэнтеролог
- Температура + слабость → Терапевт

Верни ТОЛЬКО валидный JSON массив без пояснений, markdown и текста:
[{{"symptoms": [1, 0, 1, 0, 0, 1, 0], "specialization": "Невролог"}}]

Сгенерируй ровно {n} записей с разнообразными комбинациями для каждого специалиста."""


def generate_batch(n: int) -> list:
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "user", "content": PROMPT_TEMPLATE.format(n=n)}
        ],
        "temperature": 0.7,
        "max_tokens": 4096,
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

    for i in range(4):
        print(f"Батч {i+1}/4 — генерируем 50 записей...")
        try:
            batch = generate_batch(50)
            all_data.extend(batch)
            print(f"  Получено {len(batch)} записей")
        except Exception as e:
            print(f"  Ошибка: {e}")
        time.sleep(3)

    print(f"\nВсего сгенерировано: {len(all_data)} записей")

    os.makedirs("models_store", exist_ok=True)
    existing = []
    if os.path.exists("models_store/training_data.json"):
        with open("models_store/training_data.json", encoding="utf-8") as f:
            existing = json.load(f)

    all_data = existing + all_data

    with open("models_store/training_data.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print("Данные сохранены в models_store/training_data.json")


if __name__ == "__main__":
    main()