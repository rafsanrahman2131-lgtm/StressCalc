import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

print("Generating synthetic cognitive telemetry dataset for ML training...")
np.random.seed(42)
N = 3000

# Synthetic feature generation
context_switches = np.random.randint(0, 30, N)
uninterrupted_seconds = np.random.randint(0, 1800, N)
facial_tension = np.random.uniform(5.0, 95.0, N)
overwhelm_score = np.random.randint(1, 11, N)
reaction_time_ms = np.random.uniform(220.0, 1200.0, N)
error_rate_percent = np.random.uniform(0.0, 60.0, N)
ambient_noise_weight = np.random.uniform(0.1, 1.0, N)

# Ground truth formulas with non-linear realistic noise
focus_index = (
    10.0 
    + (uninterrupted_seconds / 120.0) * 0.4
    - (context_switches * 0.35)
    - (facial_tension * 0.02)
    - (ambient_noise_weight * 1.2)
    + np.random.normal(0, 0.25, N)
)
focus_index = np.clip(focus_index, 0.0, 10.0)

cognitive_bandwidth = (
    (focus_index * 9.0)
    + (10 - overwhelm_score) * 1.2
    - (error_rate_percent * 0.15)
    + np.random.normal(0, 1.5, N)
)
cognitive_bandwidth = np.clip(cognitive_bandwidth, 10.0, 100.0)

final_stress_index = (
    (facial_tension * 0.35)
    + (overwhelm_score * 3.5)
    + (error_rate_percent * 0.2)
    + (reaction_time_ms / 15.0) * 0.2
    - (focus_index * 2.5)
    + np.random.normal(0, 2.0, N)
)
final_stress_index = np.clip(final_stress_index, 0.0, 10.0)

X = pd.DataFrame({
    'context_switches': context_switches,
    'uninterrupted_seconds': uninterrupted_seconds,
    'facial_tension': facial_tension,
    'overwhelm_score': overwhelm_score,
    'reaction_time_ms': reaction_time_ms,
    'error_rate_percent': error_rate_percent,
    'ambient_noise_weight': ambient_noise_weight
})

Y_focus = focus_index
Y_bandwidth = cognitive_bandwidth
Y_stress = final_stress_index

# Train RandomForest Regressors
print("Training RandomForestRegressor for Focus Index...")
rf_focus = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
rf_focus.fit(X, Y_focus)

print("Training RandomForestRegressor for Cognitive Bandwidth...")
rf_bandwidth = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
rf_bandwidth.fit(X, Y_bandwidth)

print("Training RandomForestRegressor for Final Stress Index...")
rf_stress = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
rf_stress.fit(X, Y_stress)

# Save models
os.makedirs('ml_service/models', exist_ok=True)
joblib.dump(rf_focus, 'ml_service/models/rf_focus.joblib')
joblib.dump(rf_bandwidth, 'ml_service/models/rf_bandwidth.joblib')
joblib.dump(rf_stress, 'ml_service/models/rf_stress.joblib')

print("SUCCESS: All 3 RandomForest ML models trained and saved to ml_service/models/")
