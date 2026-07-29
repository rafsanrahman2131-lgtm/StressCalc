from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import os

app = FastAPI(title="StressCalculator ML Prediction Engine", version="2.0.0")

# Load trained RandomForest models
models = {}

@app.on_event("startup")
def load_models():
    base_dir = os.path.dirname(__file__)
    models['focus'] = joblib.load(os.path.join(base_dir, 'models', 'rf_focus.joblib'))
    models['bandwidth'] = joblib.load(os.path.join(base_dir, 'models', 'rf_bandwidth.joblib'))
    models['stress'] = joblib.load(os.path.join(base_dir, 'models', 'rf_stress.joblib'))
    print("SUCCESS: Loaded RandomForest ML models into FastAPI memory!")

class TelemetryPayload(BaseModel):
    context_switches: int = 0
    uninterrupted_seconds: int = 0
    facial_tension: float = 20.0
    overwhelm_score: int = 5
    reaction_time_ms: float = 450.0
    error_rate_percent: float = 10.0
    ambient_noise_weight: float = 0.4

@app.get("/")
def health_check():
    return {"status": "online", "engine": "RandomForestRegressor ML Microservice"}

@app.post("/predict")
def predict_metrics(payload: TelemetryPayload):
    try:
        input_df = pd.DataFrame([{
            'context_switches': payload.context_switches,
            'uninterrupted_seconds': payload.uninterrupted_seconds,
            'facial_tension': payload.facial_tension,
            'overwhelm_score': payload.overwhelm_score,
            'reaction_time_ms': payload.reaction_time_ms,
            'error_rate_percent': payload.error_rate_percent,
            'ambient_noise_weight': payload.ambient_noise_weight
        }])

        pred_focus = float(models['focus'].predict(input_df)[0])
        pred_bandwidth = float(models['bandwidth'].predict(input_df)[0])
        pred_stress = float(models['stress'].predict(input_df)[0])

        pred_focus = round(max(0.0, min(10.0, pred_focus)), 1)
        pred_bandwidth = int(round(max(10.0, min(100.0, pred_bandwidth))))
        pred_stress = int(round(max(0.0, min(100.0, pred_stress))))

        return {
            "status": "success",
            "predicted_focus_index": pred_focus,
            "predicted_cognitive_bandwidth": pred_bandwidth,
            "predicted_stress_index": pred_stress
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
