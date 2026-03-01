DROP TABLE IF EXISTS questionnaire_answer CASCADE;
DROP TABLE IF EXISTS ai_questionnaire CASCADE;
DROP TABLE IF EXISTS ai_training_data CASCADE;
DROP TABLE IF EXISTS question CASCADE;
DROP TABLE IF EXISTS symptom CASCADE;
DROP TABLE IF EXISTS ai_model CASCADE;
DROP TABLE IF EXISTS appointment CASCADE;
DROP TABLE IF EXISTS status CASCADE;
DROP TABLE IF EXISTS doctor CASCADE;
DROP TABLE IF EXISTS patient CASCADE;
DROP TABLE IF EXISTS specialization CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS role CASCADE;


CREATE TABLE role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    UNIQUE(name, entity)
);

CREATE TABLE role_permissions (
    role_id INT REFERENCES role(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);


CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    password_hash TEXT NOT NULL,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    role_id INT NOT NULL REFERENCES role(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE specialization (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);


CREATE TABLE patient (
    user_id INT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
    birth_date DATE NOT NULL
);

CREATE TABLE doctor (
    user_id INT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
    specialization_id INT NOT NULL REFERENCES specialization(id),
    cabinet_number VARCHAR(20) NOT NULL
);


CREATE TABLE status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);


CREATE TABLE appointment (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patient(user_id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctor(user_id),
    start_time TIMESTAMP NOT NULL,
    status_id INT NOT NULL REFERENCES status(id),
    complaints TEXT,
    CONSTRAINT unique_doctor_time UNIQUE (doctor_id, start_time)
);


CREATE TABLE ai_model (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE symptom (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);


CREATE TABLE question (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    symptom_id INT REFERENCES symptom(id) ON DELETE SET NULL
);


CREATE TABLE ai_questionnaire (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patient(user_id) ON DELETE CASCADE,
    model_id INT REFERENCES ai_model(id),
    duration_days INT NOT NULL CHECK (duration_days >= 0),
    ai_result VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questionnaire_answer (
    questionnaire_id INT REFERENCES ai_questionnaire(id) ON DELETE CASCADE,
    question_id INT REFERENCES question(id) ON DELETE CASCADE,
    answer BOOLEAN NOT NULL,
    PRIMARY KEY (questionnaire_id, question_id)
);


CREATE TABLE ai_training_data (
    id SERIAL PRIMARY KEY,
    symptom_id INT REFERENCES symptom(id),
    duration_days INT NOT NULL,
    target_specialization_id INT REFERENCES specialization(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id),
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(255) NOT NULL,
    object_type VARCHAR(100) NOT NULL,
    object_id INT,
    result VARCHAR(50) NOT NULL,
    details TEXT
);