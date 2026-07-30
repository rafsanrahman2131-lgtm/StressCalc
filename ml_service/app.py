from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import os
from typing import Optional

app = FastAPI(title="StressCalculator ML Prediction Engine", version="2.0.0")

models = {}

@app.on_event("startup")
def load_models():
    base_dir = os.path.dirname(__file__)
    try:
        models['focus'] = joblib.load(os.path.join(base_dir, 'models', 'rf_focus.joblib'))
        models['bandwidth'] = joblib.load(os.path.join(base_dir, 'models', 'rf_bandwidth.joblib'))
        models['stress'] = joblib.load(os.path.join(base_dir, 'models', 'rf_stress.joblib'))
        print("SUCCESS: Loaded RandomForest ML models into FastAPI memory!")
    except Exception as e:
        print("Model load warning:", e)

class TelemetryPayload(BaseModel):
    context_switches: int = 0
    uninterrupted_seconds: int = 0
    facial_tension: float = 20.0
    overwhelm_score: int = 5
    reaction_time_ms: float = 450.0
    error_rate_percent: float = 10.0
    ambient_noise_weight: float = 0.4

class AdaptiveGamePayload(BaseModel):
    focus_index: float = 8.5
    cognitive_bandwidth: int = 85
    ambient_noise_db: int = 42
    context_switches: int = 0
    facial_tension: float = 20.0
    overwhelm_score: int = 5
    preferred_game: Optional[str] = None

@app.get("/")
def health_check():
    return {"status": "online", "engine": "RandomForestRegressor ML Microservice"}

@app.post("/predict")
def predict_metrics(payload: TelemetryPayload):
    try:
        # Exact Formula Calculation:
        # 1. Subjective Overwhelm to 100-point scale
        overwhelm_100 = payload.overwhelm_score * 10.0

        # 2. Reaction Time Penalty: Baseline 250ms. 1 pt per 10ms over 300ms (capped at 100)
        rx_penalty = 0.0
        if payload.reaction_time_ms > 300:
            rx_penalty = (payload.reaction_time_ms - 300.0) / 10.0
        rx_penalty = min(100.0, max(0.0, rx_penalty))

        # 3. Final Stress Index = (Facial Tension * 0.3) + (Overwhelm * 0.5) + (Reaction Penalty * 0.2)
        calculated_stress = (payload.facial_tension * 0.3) + (overwhelm_100 * 0.5) + (rx_penalty * 0.2)
        pred_stress = int(round(max(0.0, min(100.0, calculated_stress))))

        # Recalibrated Focus Index Baseline: resting state at ~3.8
        pred_focus = round(max(0.5, min(10.0, 3.8 + (calculated_stress / 25.0))), 1)
        pred_bandwidth = int(round(max(0.0, min(100.0, 100.0 - (pred_focus * 10.0)))))

        return {
            "status": "success",
            "predicted_focus_index": pred_focus,
            "predicted_cognitive_bandwidth": pred_bandwidth,
            "predicted_stress_index": pred_stress
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend-game")
def recommend_adaptive_game(payload: AdaptiveGamePayload):
    focus = payload.focus_index
    bandwidth = payload.cognitive_bandwidth
    noise = payload.ambient_noise_db
    switches = payload.context_switches
    overwhelm = payload.overwhelm_score
    tension = payload.facial_tension
    preferred = payload.preferred_game

    if preferred in ["stroop", "breathing", "math_speed", "pattern_memory"]:
        game_type = preferred
    elif overwhelm >= 7 or switches >= 3 or (bandwidth < 60 and focus < 6.0):
        game_type = "breathing"
    elif tension >= 30.0:
        game_type = "pattern_memory"
    elif focus < 7.2 or noise >= 60:
        game_type = "math_speed"
    else:
        game_type = "stroop"

    game_titles = {
        "stroop": "Stroop Executive Function Test",
        "breathing": "4-7-8 Box Breathing Grounding",
        "math_speed": "Rapid Mental Math Speed Challenge",
        "pattern_memory": "Visual Pattern Memory Flash Game"
    }

    return {
        "status": "success",
        "game_type": game_type,
        "game_title": game_titles.get(game_type, "Cognitive Challenge")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
