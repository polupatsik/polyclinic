import numpy as np
import pickle
import json
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

SYMPTOMS = [
    "кашель",                        
    "температура",                   
    "головная боль",                 
    "насморк",                       
    "боль в горле",                  
    "слабость",                      
    "тошнота",                       
    "боль в груди",                  
    "сыпь на коже",                  
    "повышенный сахар",              
    "нарушение зрения",              
    "боль в животе",                 
    "боль в спине",                  
    "одышка",                        
    "зуд кожи",                      
    "акне",                          
    "шелушение кожи",                
    "боль в ухе",                    
    "снижение слуха",                
    "головокружение",                
    "онемение конечностей",          
    "изжога",                        
    "учащённое сердцебиение",        
    "отёки ног",                     
    "жажда и частое мочеиспускание", 
    "двоение в глазах",              
    "боль в суставах",               
    "хрипы при дыхании",             
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

QUESTION_SYMPTOM_MAP = {
    1:  "кашель",
    2:  "температура",
    3:  "головная боль",
    4:  "насморк",
    5:  "боль в горле",
    6:  "слабость",
    7:  "тошнота",
    8:  "боль в груди",
    9:  "сыпь на коже",
    10: "повышенный сахар",
    11: "нарушение зрения",
    12: "боль в животе",
    13: "боль в спине",
    14: "одышка",
    15: "зуд кожи",
    16: "акне",
    17: "шелушение кожи",
    18: "боль в ухе",
    19: "снижение слуха",
    20: "головокружение",
    21: "онемение конечностей",
    22: "изжога",
    23: "учащённое сердцебиение",
    24: "отёки ног",
    25: "жажда и частое мочеиспускание",
    26: "двоение в глазах",
    27: "боль в суставах",
    28: "хрипы при дыхании",
}

INITIAL_QUESTION_ID = 2


def load_training_data():
    data_path = "models_store/training_data.json"
    if not os.path.exists(data_path):
        raise FileNotFoundError("Сначала запусти generate_training_data.py")

    with open(data_path, encoding="utf-8") as f:
        raw = json.load(f)

    if isinstance(raw, str):
        raw = json.loads(raw)

    X, y = [], []
    for item in raw:
        if isinstance(item, str):
            continue
        symptoms_vec = item.get("symptoms")
        spec = item.get("specialization")
        if not symptoms_vec or not spec:
            continue
        if spec not in SPECIALIZATIONS:
            continue
        if len(symptoms_vec) != len(SYMPTOMS):
            continue
        X.append(symptoms_vec)
        y.append(SPECIALIZATIONS.index(spec))

    return np.array(X), np.array(y)


X, y = load_training_data()
print(f"Загружено {len(X)} записей для обучения")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

clf = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"Точность модели: {accuracy:.2%}")
print(classification_report(y_test, y_pred, target_names=SPECIALIZATIONS))

os.makedirs("models_store", exist_ok=True)
model_data = {
    "classifier": clf,
    "symptoms": SYMPTOMS,
    "specializations": SPECIALIZATIONS,
    "accuracy": float(accuracy),
    "question_symptom_map": QUESTION_SYMPTOM_MAP,
    "initial_question_id": INITIAL_QUESTION_ID,
}
with open("models_store/classifier.pkl", "wb") as f:
    pickle.dump(model_data, f)

print("Модель сохранена в models_store/classifier.pkl")