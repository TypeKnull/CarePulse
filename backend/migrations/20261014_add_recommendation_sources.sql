-- Add provenance and idempotency keys for generated recommendations.
ALTER TABLE recommendation
    ADD COLUMN source_type VARCHAR(32) NULL AFTER status,
    ADD COLUMN source_id VARCHAR(64) NULL AFTER source_type,
    ADD COLUMN source_label VARCHAR(150) NULL AFTER source_id,
    ADD UNIQUE INDEX uq_recommendation_source (patient_id, source_type, source_id, title);
