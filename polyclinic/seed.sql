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
('Невролог'),
('Гастроэнтеролог');


INSERT INTO "user" (email, password_hash, role_id)
VALUES 
('doctor1@mail.com', 'hashedpassword', 2),
('patient1@mail.com', 'hashedpassword', 3);

INSERT INTO doctor (user_id, specialization_id, cabinet_number)
VALUES (
    (SELECT id FROM "user" WHERE email = 'doctor1@mail.com'),
    (SELECT id FROM specialization WHERE name = 'Терапевт'),
    '101'
);

INSERT INTO patient (user_id, birth_date)
VALUES (
    (SELECT id FROM "user" WHERE email = 'patient1@mail.com'),
    '2000-05-15'
);

INSERT INTO ai_model (name, version, status)
VALUES ('MedicalClassifier', '1.0', 'active');

INSERT INTO symptom (name) VALUES
('кашель'),
('температура'),
('головная боль'),
('насморк'),
('боль в горле'),
('слабость'),
('тошнота');

INSERT INTO question (text, symptom_id, is_initial) VALUES
('Есть ли кашель?', 1, true),
('Есть ли повышенная температура?', 2, true),
('Болит ли голова?', 3, true),
('Есть ли насморк?', 4, false),
('Есть ли боль в горле?', 5, false),
('Чувствуете ли слабость?', 6, false),
('Есть ли тошнота?', 7, false);