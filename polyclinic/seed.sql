
INSERT INTO "user" (username, password_hash, role_id)
VALUES ('doctor1', 'hashedpassword', 2);

INSERT INTO "user" (username, password_hash, role_id)
VALUES ('patient1', 'hashedpassword', 3);

INSERT INTO doctor (user_id, specialization_id, cabinet_number)
VALUES (1, 1, '101');

INSERT INTO patient (user_id, birth_date)
VALUES (2, '2000-05-15');

INSERT INTO appointment (patient_id, doctor_id, start_time, status_id, complaints)
VALUES (1, 1, '2025-06-01 10:00:00', 1, 'Головная боль');