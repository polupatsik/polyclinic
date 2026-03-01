

SELECT p.user_id AS patient_id,
       COUNT(a.id) AS total_appointments,
       MAX(a.start_time) AS last_visit
FROM patient p
LEFT JOIN appointment a ON p.user_id = a.patient_id
GROUP BY p.user_id
ORDER BY total_appointments DESC;



SELECT d.user_id AS doctor_id,
       COUNT(a.id) AS completed_count
FROM doctor d
JOIN appointment a ON d.user_id = a.doctor_id
JOIN status st ON a.status_id = st.id
WHERE st.name = 'COMPLETED'
GROUP BY d.user_id
HAVING COUNT(a.id) > 0
ORDER BY completed_count DESC;



SELECT *
FROM doctor d
WHERE d.user_id = (
    SELECT a.doctor_id
    FROM appointment a
    GROUP BY a.doctor_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
);



SELECT p.user_id
FROM patient p
WHERE NOT EXISTS (
    SELECT 1
    FROM appointment a
    JOIN status st ON a.status_id = st.id
    WHERE a.patient_id = p.user_id
      AND st.name = 'CANCELLED'
);



SELECT d.user_id,
       COUNT(a.id) AS total,
       SUM(CASE WHEN st.name = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
       ROUND(
           100.0 * SUM(CASE WHEN st.name = 'COMPLETED' THEN 1 ELSE 0 END)
           / NULLIF(COUNT(a.id),0),
           2
       ) AS completion_percent
FROM doctor d
LEFT JOIN appointment a ON d.user_id = a.doctor_id
LEFT JOIN status st ON a.status_id = st.id
GROUP BY d.user_id;



SELECT aq.id AS questionnaire_id,
       aq.patient_id,
       COUNT(qa.question_id) AS total_questions,
       SUM(CASE WHEN qa.answer = TRUE THEN 1 ELSE 0 END) AS positive_answers
FROM ai_questionnaire aq
LEFT JOIN questionnaire_answer qa 
       ON aq.id = qa.questionnaire_id
GROUP BY aq.id, aq.patient_id
ORDER BY positive_answers DESC;



SELECT s.name,
       COUNT(a.id) AS total_appointments
FROM specialization s
JOIN doctor d ON s.id = d.specialization_id
JOIN appointment a ON d.user_id = a.doctor_id
GROUP BY s.name
ORDER BY total_appointments DESC
LIMIT 1;



SELECT a.patient_id
FROM appointment a
JOIN doctor d ON a.doctor_id = d.user_id
GROUP BY a.patient_id
HAVING COUNT(DISTINCT d.specialization_id) > 1;



SELECT d.user_id,
       COUNT(a.id) AS total_appointments,
       RANK() OVER (ORDER BY COUNT(a.id) DESC) AS rank_position
FROM doctor d
LEFT JOIN appointment a ON d.user_id = a.doctor_id
GROUP BY d.user_id;



SELECT aq.*
FROM ai_questionnaire aq
WHERE aq.created_at = (
    SELECT MAX(aq2.created_at)
    FROM ai_questionnaire aq2
    WHERE aq2.patient_id = aq.patient_id
);