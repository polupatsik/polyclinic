DROP TABLE IF EXISTS password_reset_token CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS ai_questionnaire CASCADE;
DROP TABLE IF EXISTS appointment CASCADE;
DROP TABLE IF EXISTS doctor CASCADE;
DROP TABLE IF EXISTS patient CASCADE;
DROP TABLE IF EXISTS specialization CASCADE;
DROP TABLE IF EXISTS status CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS role CASCADE;

CREATE TABLE role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INT NOT NULL REFERENCES role(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE specialization (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE patient (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    birth_date DATE
);

CREATE TABLE doctor (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    specialization_id INT NOT NULL REFERENCES specialization(id),
    cabinet_number VARCHAR(20)
);

CREATE TABLE status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE appointment (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctor(id),
    start_time TIMESTAMP NOT NULL,
    status_id INT NOT NULL REFERENCES status(id),
    complaints TEXT
);

ALTER TABLE appointment
ADD CONSTRAINT unique_doctor_time UNIQUE (doctor_id, start_time);

CREATE TABLE ai_questionnaire (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    symptom_cough BOOLEAN,
    symptom_fever BOOLEAN,
    symptom_headache BOOLEAN,
    symptom_throat BOOLEAN,
    symptom_abdominal BOOLEAN,
    duration_days INT,
    ai_result VARCHAR(100)
);

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id),
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(255),
    object_type VARCHAR(100),
    object_id INT
);

CREATE TABLE password_reset_token (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_token ON password_reset_token(token);

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
