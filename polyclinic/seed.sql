
INSERT INTO role (name) VALUES
('ADMIN'),
('DOCTOR'),
('PATIENT');


INSERT INTO status (name) VALUES
('CREATED'),
('CONFIRMED'),
('COMPLETED'),
('CANCELLED');


INSERT INTO specialization (name) VALUES
('Терапевт'),
('ЛОР'),
('Невролог');


INSERT INTO "user" (email, password_hash, role_id)
VALUES 
('doctor1@mail.com', 'hashedpassword', 2),
('patient1@mail.com', 'hashedpassword', 3);

INSERT INTO doctor (user_id, specialization_id, cabinet_number)
VALUES (1, 1, '101');

INSERT INTO patient (user_id, birth_date)
VALUES (2, '2000-05-15');

INSERT INTO appointment (patient_id, doctor_id, start_time, status_id, complaints)
VALUES (2, 1, '2025-06-01 10:00:00', 1, 'Головная боль');

INSERT INTO ai_model (name, version)
VALUES ('MedicalClassifier', '1.0');

INSERT INTO symptom (name) VALUES
('Кашель'),
('Температура'),
('Головная боль');

INSERT INTO question (text, symptom_id) VALUES
('Есть ли кашель?', 1),
('Есть ли температура?', 2),
('Болит ли голова?', 3);