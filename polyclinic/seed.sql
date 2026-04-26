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
('Гастроэнтеролог'),
('Кардиолог'),
('Дерматолог'),
('Эндокринолог'),
('Офтальмолог'),
('Хирург'),
('Уролог'),
('Гинеколог'),
('Психиатр'),
('Ортопед'),
('Пульмонолог');


-- Пароли: admin123 / doctor123 / patient123
INSERT INTO "user" (email, password_hash, role_id, is_email_verified)
VALUES
('admin@clinic.com',  '$$2b$10$edzpDkbVwkUA1/oIVII0O.YzRD6lP3.qvcZUYL0LKa5LdrEjvag6O', 1, true),
('doctor1@mail.com',  '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('doctor2@mail.com',  '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('patient1@mail.com', '$2b$12$eVMdtwgfrmolegRvBQbGguOGfy0i4dCfGVcQR6CDqMX5e/40MjRB.', 3, true);


INSERT INTO doctor (user_id, specialization_id, cabinet_number)
VALUES (
    (SELECT id FROM "user" WHERE email = 'doctor1@mail.com'),
    (SELECT id FROM specialization WHERE name = 'Терапевт'),
    '101'
);

INSERT INTO doctor (user_id, specialization_id, cabinet_number)
VALUES (
    (SELECT id FROM "user" WHERE email = 'doctor2@mail.com'),
    (SELECT id FROM specialization WHERE name = 'Невролог'),
    '205'
);

INSERT INTO patient (user_id, birth_date)
VALUES (
    (SELECT id FROM "user" WHERE email = 'patient1@mail.com'),
    '2000-05-15'
);

INSERT INTO ai_model (name, version, status)
VALUES ('MedicalClassifier', '1.0', 'active');

-- 14 симптомов, покрывающих все специализации
INSERT INTO symptom (name) VALUES
('кашель'),           -- 1
('температура'),      -- 2
('головная боль'),    -- 3
('насморк'),          -- 4
('боль в горле'),     -- 5
('слабость'),         -- 6
('тошнота'),          -- 7
('боль в груди'),     -- 8  → Кардиолог
('сыпь на коже'),     -- 9  → Дерматолог
('повышенный сахар'), -- 10 → Эндокринолог
('нарушение зрения'), -- 11 → Офтальмолог
('боль в животе'),    -- 12 → Хирург/Гастроэнтеролог
('боль в спине'),     -- 13 → Ортопед
('одышка');           -- 14 → Пульмонолог

-- 14 вопросов (ID 1-14 соответствуют симптомам 1-14)
INSERT INTO question (text, symptom_id, is_initial) VALUES
('Есть ли кашель?',                  (SELECT id FROM symptom WHERE name = 'кашель'),           true),
('Есть ли повышенная температура?',  (SELECT id FROM symptom WHERE name = 'температура'),      true),
('Болит ли голова?',                 (SELECT id FROM symptom WHERE name = 'головная боль'),    true),
('Есть ли насморк?',                 (SELECT id FROM symptom WHERE name = 'насморк'),          false),
('Есть ли боль в горле?',            (SELECT id FROM symptom WHERE name = 'боль в горле'),     false),
('Чувствуете ли слабость?',          (SELECT id FROM symptom WHERE name = 'слабость'),         false),
('Есть ли тошнота или рвота?',       (SELECT id FROM symptom WHERE name = 'тошнота'),          false),
('Есть ли боль или давление в груди?',(SELECT id FROM symptom WHERE name = 'боль в груди'),   true),
('Есть ли сыпь или раздражение кожи?',(SELECT id FROM symptom WHERE name = 'сыпь на коже'),   true),
('Беспокоит ли повышенный уровень сахара или жажда?', (SELECT id FROM symptom WHERE name = 'повышенный сахар'), true),
('Есть ли нарушения зрения?',        (SELECT id FROM symptom WHERE name = 'нарушение зрения'), true),
('Есть ли боль в животе?',           (SELECT id FROM symptom WHERE name = 'боль в животе'),    false),
('Есть ли боль в спине или суставах?',(SELECT id FROM symptom WHERE name = 'боль в спине'),   true),
('Есть ли одышка или затруднённое дыхание?', (SELECT id FROM symptom WHERE name = 'одышка'),  false);
