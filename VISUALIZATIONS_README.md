# CarePulse Plotly Visualization Assignment

This standalone Python 3.11+ deliverable builds four CarePulse-themed Plotly figures from the same reproducible synthetic diabetes cohort generator used by the project's ML training pipeline. No patient records are included. The risk surface visualizes that generator's probability equation and is not a clinical model or medical advice.

## Install and run

From the project root, create/activate a Python 3.11 virtual environment, then run:

```powershell
python -m pip install -r requirements.txt
python plotly_visualizations.py
```

The source defines interactive Plotly figures. Kaleido export could not start a browser in the current Windows environment (neither the installed Edge nor Kaleido's Chrome subprocess returned an image), so the script uses Matplotlib as the reliable static PNG fallback. It writes four 2400 × 1600 PNG figures, the deterministic synthetic input CSV, and a multi-page PDF to `output/`. PNG/PDF files are static; Plotly interactivity is retained in the Python figure definitions.

The Python figures retain Plotly hover, 3D orbit/zoom, legend toggles, and parallel-coordinate brushing. PNG and PDF exports are static.
