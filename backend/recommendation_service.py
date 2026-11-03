"""Build patient-scoped educational recommendations from saved clinical inputs."""

from hashlib import sha256


def _stable_id(prefix, *parts):
    value = '\x1f'.join(str(part) for part in parts)
    return f'{prefix}-{sha256(value.encode("utf-8")).hexdigest()[:40]}'


def build_assessment_recommendations(result, source_id):
    """Convert recommendations returned by the real prediction into persisted suggestions."""
    disease_title = result.get('diseaseTitle') or result.get('disease') or 'risk assessment'
    items = []
    for recommendation in result.get('recommendations') or []:
        if not isinstance(recommendation, dict):
            continue
        title = recommendation.get('title')
        action = recommendation.get('action')
        if not isinstance(title, str) or not title.strip() or not isinstance(action, str) or not action.strip():
            continue
        items.append({
            'title': title.strip()[:150],
            'description': f'{action.strip()} This is an educational model suggestion, not a clinician-prescribed follow-up.',
            'priority': str(recommendation.get('urgency') or 'Routine')[:30],
            'action': action.strip(),
            'targetMetric': str(recommendation.get('category') or 'Risk assessment')[:100],
            'expectedImpact': 'Supports an informed discussion with a healthcare professional',
            'sourceType': 'assessment',
            'sourceId': str(source_id),
            'sourceLabel': f'Model assessment — {disease_title} (educational; not clinician-prescribed)'[:150],
        })
    return items


def _number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_measurement_recommendations(vital_rows, lab_rows, age):
    """Create non-diagnostic reminders only for actual adult BP or report-flagged lab records."""
    items = []
    if age is not None and age >= 18:
        for row in vital_rows:
            systolic = _number(row.get('systolic_bp'))
            diastolic = _number(row.get('diastolic_bp'))
            if systolic is None or diastolic is None or not (systolic >= 130 or diastolic >= 80):
                continue
            items.append({
                'title': 'Review a recorded blood-pressure reading',
                'description': f'A saved reading was {systolic:g}/{diastolic:g} mmHg. One reading is not a diagnosis; this educational reminder is not a clinician order.',
                'priority': 'Routine',
                'action': 'Consider discussing repeated readings with a healthcare professional; a single measurement does not diagnose a condition.',
                'targetMetric': 'Blood pressure',
                'expectedImpact': 'Supports an informed clinical discussion',
                'sourceType': 'vital',
                'sourceId': str(row['vital_id']),
                'sourceLabel': 'Recorded blood-pressure measurement (educational; not clinician-prescribed)',
            })

    for row in lab_rows:
        if not row.get('is_abnormal'):
            continue
        test_name = str(row.get('test_name') or 'lab result').strip()
        items.append({
            'title': f'Review the {test_name} result'[:150],
            'description': 'The laboratory report marked this result abnormal. This educational reminder is not a diagnosis or clinician-prescribed follow-up.',
            'priority': 'Routine',
            'action': 'Review the result and its reference range with a healthcare professional in the context of the full report.',
            'targetMetric': test_name[:100],
            'expectedImpact': 'Supports an informed clinical discussion',
            'sourceType': 'lab_result',
            'sourceId': str(row['lab_result_id']),
            'sourceLabel': f'Lab report flagged {test_name} (educational; not clinician-prescribed)'[:150],
        })
    return items


def build_persistence_statements(patient_id, recommendations):
    """Return deterministic, duplicate-safe recommendation/action inserts."""
    statements = []
    for item in recommendations:
        recommendation_id = _stable_id(
            'REC', patient_id, item['sourceType'], item['sourceId'], item['title'].casefold()
        )
        action_id = _stable_id('ACT', recommendation_id, item['action'])
        statements.extend([
            (
                """INSERT INTO recommendation
                   (recommendation_id, patient_id, title, description, priority, status,
                    source_type, source_id, source_label)
                   VALUES (%s, %s, %s, %s, %s, 'Active', %s, %s, %s)
                   ON DUPLICATE KEY UPDATE created_at = created_at""",
                (recommendation_id, patient_id, item['title'], item['description'], item['priority'],
                 item['sourceType'], item['sourceId'], item['sourceLabel'])
            ),
            (
                """INSERT INTO recommendation_action
                   (action_id, recommendation_id, action_text, target_metric, expected_impact)
                   VALUES (%s, %s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE created_at = created_at""",
                (action_id, recommendation_id, item['action'], item['targetMetric'], item['expectedImpact'])
            ),
        ])
    return statements
