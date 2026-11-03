"""Experimental, non-diagnostic wellness indicator based on recorded values."""


def calculate_health_index(systolic, diastolic, fasting_glucose, bmi, total_cholesterol, age):
    components = []

    if systolic is not None and diastolic is not None and age is not None and age >= 18:
        if systolic >= 180 or diastolic >= 120:
            score, label = 0, 'Very high reading'
        elif systolic >= 140 or diastolic >= 90:
            score, label = 35, 'Stage 2 range'
        elif systolic >= 130 or diastolic >= 80:
            score, label = 60, 'Stage 1 range'
        elif systolic >= 120 and diastolic < 80:
            score, label = 80, 'Elevated range'
        else:
            score, label = 100, 'Below elevated range'
        components.append({'name': 'Blood pressure', 'score': score, 'label': label})

    if fasting_glucose is not None:
        if fasting_glucose < 70:
            score, label = 0, 'Below common fasting reference range'
        elif fasting_glucose < 100:
            score, label = 100, 'Within common fasting reference range'
        elif fasting_glucose < 126:
            score, label = 70, 'Above common fasting reference range'
        else:
            score, label = 40, 'High fasting result; confirmation is clinical'
        components.append({'name': 'Fasting glucose', 'score': score, 'label': label})

    if bmi is not None and age is not None and age >= 20:
        if bmi < 18.5:
            score, label = 50, 'Below common adult BMI range'
        elif bmi < 25:
            score, label = 100, 'Within common adult BMI range'
        elif bmi < 30:
            score, label = 75, 'Above common adult BMI range'
        else:
            score, label = 50, 'Above common adult BMI range'
        components.append({'name': 'BMI (adult reference)', 'score': score, 'label': label})

    if total_cholesterol is not None and age is not None and age >= 20:
        score, label = (100, 'Below 200 mg/dL') if total_cholesterol < 200 else (50, '200 mg/dL or above')
        components.append({'name': 'Total cholesterol', 'score': score, 'label': label})

    missing = []
    if systolic is None or diastolic is None:
        missing.append('complete blood pressure reading')
    elif age is None or age < 18:
        missing.append('age for adult blood-pressure reference')
    if fasting_glucose is None:
        missing.append('fasting glucose result')
    if bmi is None:
        missing.append('height and weight for BMI')
    elif age is None:
        missing.append('date of birth to interpret adult BMI')
    if total_cholesterol is None:
        missing.append('total cholesterol result')
    elif age is None or age < 20:
        missing.append('age for adult cholesterol reference')

    score = round(sum(item['score'] for item in components) / len(components)) if len(components) >= 2 else None
    return {
        'score': score,
        'components': components,
        'missingInputs': missing,
        'method': 'Equal-weight average of available indicator points; shown only when at least two inputs are available.',
        'disclaimer': 'Experimental wellness indicator only. Not clinically validated and not a diagnosis or treatment recommendation.',
    }
