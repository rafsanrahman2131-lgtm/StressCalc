from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import os

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

@app.post("/recommend-game")
def recommend_adaptive_game(payload: AdaptiveGamePayload):
    focus = payload.focus_index
    bandwidth = payload.cognitive_bandwidth
    noise = payload.ambient_noise_db
    switches = payload.context_switches
    overwhelm = payload.overwhelm_score
    tension = payload.facial_tension

    # Adaptive Decision Logic Matrix:
    # 1. High Overwhelm (>=7), High Switches (>=3), or Severe Cognitive Fatigue (Bandwidth <60 & Focus <6.0)
    #    -> "breathing" (Guided 4-7-8 Box Breathing & Focus Grounding)
    # 2. Low Focus (<7.0) or High Ambient Noise (>=60 dB)
    #    -> "math_speed" (Rapid Arithmetic Agility Challenge)
    # 3. High Facial Muscle Tension (>=35.0)
    #    -> "pattern_memory" (Visual Pattern Flash Recall)
    # 4. Sustained High Focus & Optimal Baseline
    #    -> "stroop" (Stroop Ink-Color Executive Challenge)

    if overwhelm >= 7 or switches >= 3 or (bandwidth < 60 and focus < 6.0):
        game_type = "breathing"
        game_title = "4-7-8 Box Breathing Grounding"
        reason = "High stress & frequent tab switching detected. Prompted Vagus Reset Box Breathing to lower cognitive load."
    elif focus < 7.2 or noise >= 60:
        game_type = "math_speed"
        game_title = "Rapid Mental Math Speed Challenge"
        reason = "Sub-optimal focus & ambient noise detected. Prompted rapid mental arithmetic to re-engage executive focus."
    elif tension >= 30.0:
        game_type = "pattern_memory"
        game_title = "Visual Pattern Memory Flash Game"
        reason = "Elevated facial tension detected. Prompted visual spatial memory exercise to relieve tension."
    else:
        game_type = "stroop"
        game_title = "Stroop Executive Function Test"
        reason = "Optimal capacity baseline. Prompted Stroop reaction speed test."

    return {
        "status": "success",
        "game_type": game_type,
        "game_title": game_title,
        "recommendation_reason": reason
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
