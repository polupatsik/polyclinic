
SELECT a.id,
       a.start_time,
       aps.name AS status,
       d.cabinet_number,
       s.name AS specialization
FROM appointment a
JOIN appointment_status aps ON a.status_id = aps.id
JOIN doctor d ON a.doctor_id = d.id
JOIN specialization s ON d.specialization_id = s.id
WHERE a.patient_id = 1
ORDER BY a.start_time;


SELECT a.start_time,
       p.id AS patient_id,
       aps.name AS status
FROM appointment a
JOIN patient p ON a.patient_id = p.id
JOIN appointment_status aps ON a.status_id = aps.id
WHERE a.doctor_id = 1
ORDER BY a.start_time;


SELECT d.id AS doctor_id,
       COUNT(a.id) AS total_appointments
FROM doctor d
LEFT JOIN appointment a ON d.id = a.doctor_id
GROUP BY d.id
ORDER BY total_appointments DESC;



SELECT d.id AS doctor_id,
       COUNT(a.id) AS total
FROM doctor d
JOIN appointment a ON d.id = a.doctor_id
GROUP BY d.id
ORDER BY total DESC
LIMIT 1;


SELECT aps.name AS status,
       COUNT(a.id) AS total
FROM appointment_status aps
LEFT JOIN appointment a ON aps.id = a.status_id
GROUP BY aps.name
ORDER BY total DESC;


SELECT u.username,
       al.action,
       al.object_type,
       al.object_id,
       al.result,
       al.action_time
FROM audit_log al
JOIN "user" u ON al.user_id = u.id
WHERE u.id = 1
ORDER BY al.action_time DESC;


SELECT DISTINCT p.id AS patient_id
FROM patient p
JOIN appointment a ON p.id = a.patient_id
JOIN doctor d ON a.doctor_id = d.id
JOIN specialization s ON d.specialization_id = s.id
WHERE s.name = 'Терапевт';


SELECT *
FROM appointment
WHERE status_id = (
    SELECT id
    FROM appointment_status
    WHERE name = 'CANCELLED'
);


SELECT *
FROM appointment
WHERE DATE(start_time) = CURRENT_DATE;


SELECT symptom_cough,
       symptom_fever,
       symptom_headache,
       symptom_throat,
       symptom_abdominal,
       duration_days,
       target_specialization
FROM ai_training_data;d;