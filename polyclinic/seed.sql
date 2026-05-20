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
('Ортопед'),
('Пульмонолог');


-- Пароли: admin123 / doctor123 / patient123
INSERT INTO "user" (email, password_hash, role_id, is_email_verified)
VALUES
('admin@clinic.com',       '$2b$12$lGSNtg2Opbij46iXJQgZquVBwayV8mi6kYWMNqr5crgjt0PZmnVHm', 1, true),
('doctor1@mail.com',       '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('doctor2@mail.com',       '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('doctor3@mail.com',       '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('doctor4@mail.com',       '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('doctor5@mail.com',       '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('doctor6@mail.com',       '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('doctor7@mail.com',       '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('doctor8@mail.com',       '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('doctor9@mail.com',       '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('doctor10@mail.com',      '$2b$12$.lWGw8YylTmRXPkIigC6LOezOipF5hg9DT2r9oemGOSAmoG6c3kTi', 2, true),
('patient1@mail.com',      '$2b$12$eVMdtwgfrmolegRvBQbGguOGfy0i4dCfGVcQR6CDqMX5e/40MjRB.', 3, true);


INSERT INTO doctor (user_id, specialization_id, cabinet_number) VALUES
((SELECT id FROM "user" WHERE email='doctor1@mail.com'),  (SELECT id FROM specialization WHERE name='Терапевт'),       '101'),
((SELECT id FROM "user" WHERE email='doctor2@mail.com'),  (SELECT id FROM specialization WHERE name='Невролог'),       '205'),
((SELECT id FROM "user" WHERE email='doctor3@mail.com'),  (SELECT id FROM specialization WHERE name='ЛОР'),            '108'),
((SELECT id FROM "user" WHERE email='doctor4@mail.com'),  (SELECT id FROM specialization WHERE name='Гастроэнтеролог'),'312'),
((SELECT id FROM "user" WHERE email='doctor5@mail.com'),  (SELECT id FROM specialization WHERE name='Кардиолог'),      '214'),
((SELECT id FROM "user" WHERE email='doctor6@mail.com'),  (SELECT id FROM specialization WHERE name='Дерматолог'),     '115'),
((SELECT id FROM "user" WHERE email='doctor7@mail.com'),  (SELECT id FROM specialization WHERE name='Эндокринолог'),   '310'),
((SELECT id FROM "user" WHERE email='doctor8@mail.com'),  (SELECT id FROM specialization WHERE name='Офтальмолог'),    '202'),
((SELECT id FROM "user" WHERE email='doctor9@mail.com'),  (SELECT id FROM specialization WHERE name='Ортопед'),        '318'),
((SELECT id FROM "user" WHERE email='doctor10@mail.com'), (SELECT id FROM specialization WHERE name='Пульмонолог'),    '220');


INSERT INTO patient (user_id, birth_date)
VALUES ((SELECT id FROM "user" WHERE email='patient1@mail.com'), '2000-05-15');


INSERT INTO ai_model (name, version, status)
VALUES ('MedicalClassifier', '1.0', 'active');



-- СИМПТОМЫ (28 штук)
INSERT INTO symptom (name) VALUES
('кашель'),
('температура'),
('головная боль'),
('насморк'),
('боль в горле'),
('слабость'),
('тошнота'),
('боль в груди'),
('сыпь на коже'),
('повышенный сахар'),
('нарушение зрения'),
('боль в животе'),
('боль в спине'),
('одышка'),
('зуд кожи'),
('акне'),
('шелушение кожи'),
('боль в ухе'),
('снижение слуха'),
('головокружение'),
('онемение конечностей'),
('изжога'),
('учащённое сердцебиение'),
('отёки ног'),
('жажда и частое мочеиспускание'),
('двоение в глазах'),
('боль в суставах'),
('хрипы при дыхании');



-- ВОПРОСЫ
INSERT INTO question (text, symptom_id, is_initial) VALUES
('Есть ли кашель?',
    (SELECT id FROM symptom WHERE name='кашель'), true),
('Есть ли повышенная температура?',
    (SELECT id FROM symptom WHERE name='температура'), true),
('Болит ли голова?',
    (SELECT id FROM symptom WHERE name='головная боль'), true),
('Есть ли насморк?',
    (SELECT id FROM symptom WHERE name='насморк'), false),
('Есть ли боль в горле?',
    (SELECT id FROM symptom WHERE name='боль в горле'), false),
('Чувствуете ли слабость?',
    (SELECT id FROM symptom WHERE name='слабость'), false),
('Есть ли тошнота или рвота?',
    (SELECT id FROM symptom WHERE name='тошнота'), false),
('Есть ли боль или давление в груди?',
    (SELECT id FROM symptom WHERE name='боль в груди'), true),
('Есть ли сыпь или раздражение кожи?',
    (SELECT id FROM symptom WHERE name='сыпь на коже'), true),
('Беспокоит ли повышенный уровень сахара или жажда?',
    (SELECT id FROM symptom WHERE name='повышенный сахар'), true),
('Есть ли нарушения зрения?',
    (SELECT id FROM symptom WHERE name='нарушение зрения'), true),
('Есть ли боль в животе?',
    (SELECT id FROM symptom WHERE name='боль в животе'), false),
('Есть ли боль в спине или суставах?',
    (SELECT id FROM symptom WHERE name='боль в спине'), true),
('Есть ли одышка или затруднённое дыхание?',
    (SELECT id FROM symptom WHERE name='одышка'), false),
('Беспокоит ли зуд кожи?',
    (SELECT id FROM symptom WHERE name='зуд кожи'), false),
('Есть ли акне или угревая сыпь?',
    (SELECT id FROM symptom WHERE name='акне'), false),
('Есть ли шелушение или сухость кожи?',
    (SELECT id FROM symptom WHERE name='шелушение кожи'), false),
('Есть ли боль в ухе?',
    (SELECT id FROM symptom WHERE name='боль в ухе'), false),
('Заметили ли снижение слуха?',
    (SELECT id FROM symptom WHERE name='снижение слуха'), false),
('Есть ли головокружение?',
    (SELECT id FROM symptom WHERE name='головокружение'), false),
('Есть ли онемение или покалывание в руках или ногах?',
    (SELECT id FROM symptom WHERE name='онемение конечностей'), false),
('Беспокоит ли изжога или частая отрыжка?',
    (SELECT id FROM symptom WHERE name='изжога'), false),
('Есть ли учащённое сердцебиение или перебои в работе сердца?',
    (SELECT id FROM symptom WHERE name='учащённое сердцебиение'), false),
('Есть ли отёки ног?',
    (SELECT id FROM symptom WHERE name='отёки ног'), false),
('Беспокоит ли сильная жажда или частое мочеиспускание?',
    (SELECT id FROM symptom WHERE name='жажда и частое мочеиспускание'), true),
('Есть ли двоение в глазах?',
    (SELECT id FROM symptom WHERE name='двоение в глазах'), false),
('Есть ли боль в суставах?',
    (SELECT id FROM symptom WHERE name='боль в суставах'), false),
('Есть ли хрипы или свист при дыхании?',
    (SELECT id FROM symptom WHERE name='хрипы при дыхании'), false);