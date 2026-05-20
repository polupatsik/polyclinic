import json
import random
import os

random.seed(42)

#28 симптомов 
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

SPECIALIZATION_PROFILES = {
    "ЛОР": {
        "core":     [3, 4, 17],        #насморк, боль в горле, боль в ухе
        "likely":   [0, 1, 18, 19],    #кашель, температура, снижение слуха, головокружение
        "possible": [5, 2],
    },
    "Пульмонолог": {
        "core":     [0, 13, 27],       #кашель, одышка, хрипы
        "likely":   [1, 5, 7],         #температура, слабость, боль в груди
        "possible": [2, 6],
    },
    "Терапевт": {
        "core":     [1, 5],            #температура, слабость
        "likely":   [0, 2, 3],         #кашель, голова, насморк
        "possible": [6, 4],
    },
    "Невролог": {
        "core":     [2, 19, 20],       #головная боль, головокружение, онемение
        "likely":   [5, 6],            #слабость, тошнота
        "possible": [1, 12],
    },
    "Гастроэнтеролог": {
        "core":     [6, 11, 21],       #тошнота, боль в животе, изжога
        "likely":   [5, 1],            #слабость, температура
        "possible": [2, 7],
    },
    "Кардиолог": {
        "core":     [7, 22, 23],       #боль в груди, сердцебиение, отёки
        "likely":   [13, 5],           #одышка, слабость
        "possible": [6, 1],
    },
    "Дерматолог": {
        "core":     [8, 14, 16],       #сыпь, зуд, шелушение
        "likely":   [15, 1],           #акне, температура
        "possible": [5, 6],
    },
    "Эндокринолог": {
        "core":     [9, 24, 23],       #сахар, жажда/моч., отёки
        "likely":   [5, 10],           #слабость, нарушение зрения
        "possible": [2, 1],
    },
    "Офтальмолог": {
        "core":     [10, 25],          #нарушение зрения, двоение
        "likely":   [2, 6],            #головная боль, тошнота
        "possible": [5, 19],
    },
    "Ортопед": {
        "core":     [12, 26, 20],      #боль в спине, суставы, онемение
        "likely":   [5, 2],            #слабость, головная боль
        "possible": [13, 6],
    },
}

RECORDS_PER_SPEC = 150


def generate_record(spec):
    profile = SPECIALIZATION_PROFILES[spec]
    vector = [0] * len(SYMPTOMS)

    for idx in profile["core"]:
        vector[idx] = 1

    n_likely = random.randint(1, len(profile["likely"]))
    for idx in random.sample(profile["likely"], n_likely):
        vector[idx] = 1

    for idx in profile["possible"]:
        if random.random() < 0.35:
            vector[idx] = 1

    return {"symptoms": vector, "specialization": spec}


def main():
    print("Генерация обучающих данных локально...")
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
    print("Теперь запусти: python3 train_model.py")


if __name__ == "__main__":
    main()