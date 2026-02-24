
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS role_permission CASCADE;
DROP TABLE IF EXISTS permission CASCADE;
DROP TABLE IF EXISTS ai_training_data CASCADE;
DROP TABLE IF EXISTS ai_questionnaire CASCADE;
DROP TABLE IF EXISTS appointment CASCADE;
DROP TABLE IF EXISTS doctor CASCADE;
DROP TABLE IF EXISTS patient CASCADE;
DROP TABLE IF EXISTS specialization CASCADE;
DROP TABLE IF EXISTS appointment_status CASCADE;
DROP TABLE IF EXISTS user_status CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS role CASCADE;

CREATE TABLE role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE permission (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    UNIQUE(name, entity)
);

CREATE TABLE role_permission (
    role_id INT NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INT NOT NULL REFERENCES role(id),
    status_id INT NOT NULL REFERENCES user_status(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE specialization (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE patient (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    birth_date DATE NOT NULL
);

CREATE TABLE doctor (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    specialization_id INT NOT NULL REFERENCES specialization(id),
    cabinet_number VARCHAR(20) NOT NULL
);

CREATE TABLE appointment_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE appointment (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctor(id),
    start_time TIMESTAMP NOT NULL,
    status_id INT NOT NULL REFERENCES appointment_status(id),
    complaints TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_doctor_time UNIQUE (doctor_id, start_time)
);

CREATE TABLE ai_questionnaire (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    symptom_cough BOOLEAN NOT NULL,
    symptom_fever BOOLEAN NOT NULL,
    symptom_headache BOOLEAN NOT NULL,
    symptom_throat BOOLEAN NOT NULL,
    symptom_abdominal BOOLEAN NOT NULL,
    duration_days INT NOT NULL CHECK (duration_days >= 0),
    ai_result VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_training_data (
    id SERIAL PRIMARY KEY,
    symptom_cough BOOLEAN NOT NULL,
    symptom_fever BOOLEAN NOT NULL,
    symptom_headache BOOLEAN NOT NULL,
    symptom_throat BOOLEAN NOT NULL,
    symptom_abdominal BOOLEAN NOT NULL,
    duration_days INT NOT NULL,
    target_specialization VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id),
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(255) NOT NULL,
    object_type VARCHAR(100) NOT NULL,
    object_id INT,
    result VARCHAR(50) NOT NULL, -- SUCCESS / ERROR
    details TEXT
);

INSERT INTO role (name, description) VALUES
('ADMIN', 'Системный администратор'),
('DOCTOR', 'Врач'),
('PATIENT', 'Пациент');

INSERT INTO user_status (name) VALUES
('ACTIVE'),
('BLOCKED');

INSERT INTO appointment_status (name) VALUES
('CREATED'),
('CONFIRMED'),
('COMPLETED'),
('CANCELLED');

INSERT INTO specialization (name) VALUES
('Терапевт'),
('ЛОР'),
('Невролог');