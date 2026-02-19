SELECT 
    a.id AS appointment_id,
    u_p.username AS patient,
    u_d.username AS doctor,
    s.name AS status,
    a.start_time,
    a.complaints
FROM appointment a
JOIN patient p ON a.patient_id = p.id
JOIN "user" u_p ON p.user_id = u_p.id
JOIN doctor d ON a.doctor_id = d.id
JOIN "user" u_d ON d.user_id = u_d.id
JOIN status s ON a.status_id = s.id;