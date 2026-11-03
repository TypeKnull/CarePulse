-- =====================================================================
-- CarePulse Healthcare Management & Disease Risk Prediction System
-- Reference Catalog Seed Data (Non-sensitive catalog data only)
-- Note: Does NOT seed synthetic patient data into authentic user tables.
-- =====================================================================

USE carepulse;

-- ---------------------------------------------------------------------
-- Seed Disease Models Catalog
-- ---------------------------------------------------------------------
INSERT INTO disease_model (model_id, disease_name, algorithm, model_version, description, is_active)
VALUES
    ('MOD-DIABETES-01', 'diabetes', 'RandomForestClassifier', 'v1.2.0', 'Supervised ensemble classification assessing metabolic, glycemic, and demographic risk factors for Type-2 Diabetes.', TRUE),
    ('MOD-CARDIO-01', 'cardiovascular', 'GradientBoostingClassifier', 'v1.1.0', 'Multivariate atherosclerotic and cardiovascular risk stratification model incorporating lipid profiles and blood pressure.', TRUE),
    ('MOD-HYPERTENSION-01', 'hypertension', 'LogisticRegression-Ensemble', 'v1.0.0', 'Arterial compliance and vascular resistance classification analyzing hemodynamic vitals and lifestyle indicators.', TRUE)
ON DUPLICATE KEY UPDATE
    algorithm = VALUES(algorithm),
    model_version = VALUES(model_version),
    description = VALUES(description),
    is_active = VALUES(is_active);

-- ---------------------------------------------------------------------
-- Seed Clinical Specialists Catalog
-- ---------------------------------------------------------------------
INSERT INTO doctor (doctor_id, full_name, specialization, phone, email, is_active)
VALUES
    ('DOC-ENDO-01', 'Dr. Sarah Lin, MD', 'Endocrinology & Diabetology', '+1-555-0144', 'clinics.lin@carepulse.internal', TRUE),
    ('DOC-CARD-02', 'Dr. Marcus Vance, MD, FACC', 'Cardiology & Vascular Medicine', '+1-555-0182', 'clinics.vance@carepulse.internal', TRUE),
    ('DOC-IMED-03', 'Dr. Priya Patel, MD', 'Internal & Preventative Medicine', '+1-555-0199', 'clinics.patel@carepulse.internal', TRUE)
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    specialization = VALUES(specialization),
    phone = VALUES(phone),
    email = VALUES(email),
    is_active = VALUES(is_active);
