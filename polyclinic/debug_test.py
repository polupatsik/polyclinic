import pickle
import numpy as np

# Симптомы из диалога: головная боль + головокружение (без температуры)
symptom_answers = {
    "температура выше 37.5": False,
    "головная боль": True,
    "головокружение": True,
    "онемение конечностей": False,
}

model_path = "models_store/classifier.pkl"
with open(model_path, "rb") as f:
    model_data = pickle.load(f)

clf = model_data["classifier"]
symptoms = model_data["symptoms"]
specializations = model_data["specializations"]

print("=== Симптомы в модели ===")
for i, s in enumerate(symptoms):
    print(f"  {i:2d}: {s}")

print("\n=== Вектор из symptom_answers ===")
symptom_vector = [0] * len(symptoms)
for symptom_name, answer in symptom_answers.items():
    if symptom_name in symptoms and answer:
        idx = symptoms.index(symptom_name)
        symptom_vector[idx] = 1
        print(f"  ✅ найден: '{symptom_name}' → индекс {idx}")
    elif symptom_name not in symptoms:
        print(f"  ❌ НЕ НАЙДЕН в модели: '{symptom_name}'")

print(f"\nВектор: {symptom_vector}")
print(f"Активных симптомов: {sum(symptom_vector)}")

features_array = np.array(symptom_vector).reshape(1, -1)
prediction = clf.predict(features_array)[0]
probabilities = clf.predict_proba(features_array)[0]

print(f"\n=== Результат модели ===")
print(f"Предсказание: {specializations[prediction]}")
print(f"\nВсе вероятности:")
for i, (spec, prob) in enumerate(zip(specializations, probabilities)):
    bar = "█" * int(prob * 30)
    print(f"  {spec:<22} {prob:.4f}  {bar}")