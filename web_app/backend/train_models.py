import os
import pickle
import json

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import LabelEncoder


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)
DATA_PATH = os.path.join(os.path.dirname(BASE_DIR), 'data')
FEATURES_PATH = os.path.join(DATA_PATH, 'morocco_climate_features.csv')
MODEL_DIR = os.path.join(SCRIPT_DIR, 'models')
MODEL_METADATA_PATH = os.path.join(MODEL_DIR, 'model_metadata.json')
DROUGHT_PROBABILITY_THRESHOLD = 0.40

FEATURE_COLUMNS = [
    'city_encoded', 'precipitation_sum', 'temperature_2m_mean', 'et0_fao_evapotranspiration',
    'water_balance', 'precip_lag1', 'precip_lag2', 'precip_lag3', 'temp_lag1', 'temp_lag2',
    'temp_lag3', 'precip_rolling3', 'precip_rolling6', 'temp_rolling3', 'et0_rolling3',
    'month', 'season_encoded'
]


def predict_with_threshold(model: RandomForestClassifier, X: pd.DataFrame, threshold: float) -> pd.Series:
    """Convert drought probabilities to labels using a recall-friendly threshold."""
    drought_probabilities = model.predict_proba(X)[:, 1]
    return (drought_probabilities >= threshold).astype(int)


def build_metric_summary(y_true: pd.Series, y_pred, y_probability) -> dict:
    """Create a compact metrics payload for console output and metadata."""
    summary = {
        'accuracy': accuracy_score(y_true, y_pred),
        'balanced_accuracy': balanced_accuracy_score(y_true, y_pred),
        'precision_drought': precision_score(y_true, y_pred, zero_division=0),
        'recall_drought': recall_score(y_true, y_pred, zero_division=0),
        'f1_drought': f1_score(y_true, y_pred, zero_division=0),
    }

    if len(set(y_true)) == 2:
        summary['roc_auc'] = roc_auc_score(y_true, y_probability)

    return {key: round(value, 4) for key, value in summary.items()}


def main() -> None:
    df = pd.read_csv(FEATURES_PATH)
    df['time'] = pd.to_datetime(df['time'])

    encoder = LabelEncoder()
    df['city_encoded'] = encoder.fit_transform(df['city'].astype(str))

    # The target is based on SPI, so SPI itself must not be used as an input
    # feature. Keeping it out avoids target leakage and overly optimistic tests.
    df['drought_target'] = (df['drought_label'] == 'Drought').astype(int)
    df = (
        df.dropna(subset=FEATURE_COLUMNS + ['drought_target'])
        .sort_values('time')
        .reset_index(drop=True)
    )

    X = df[FEATURE_COLUMNS].fillna(0)
    y = df['drought_target']

    cutoff_date = df['time'].quantile(0.8)
    train_mask = df['time'] <= cutoff_date
    test_mask = df['time'] > cutoff_date

    X_train, X_test = X.loc[train_mask], X.loc[test_mask]
    y_train, y_test = y.loc[train_mask], y.loc[test_mask]

    model = RandomForestClassifier(
        n_estimators=500,
        random_state=42,
        class_weight='balanced_subsample',
        n_jobs=-1,
        max_depth=10,
        min_samples_leaf=8,
        min_samples_split=20,
        max_features='sqrt',
    )
    model.fit(X_train, y_train)

    train_probability = model.predict_proba(X_train)[:, 1]
    test_probability = model.predict_proba(X_test)[:, 1]
    train_prediction = predict_with_threshold(model, X_train, DROUGHT_PROBABILITY_THRESHOLD)
    test_prediction = predict_with_threshold(model, X_test, DROUGHT_PROBABILITY_THRESHOLD)

    train_metrics = build_metric_summary(y_train, train_prediction, train_probability)
    test_metrics = build_metric_summary(y_test, test_prediction, test_probability)

    print(f'Dataset rows: {len(df)}')
    print(f'Date range: {df["time"].min().date()} to {df["time"].max().date()}')
    print(f'Temporal split cutoff: {cutoff_date.date()}')
    print(f'Train rows: {len(y_train)} | Test rows: {len(y_test)}')
    print(f'Drought rate train/test: {y_train.mean():.3f}/{y_test.mean():.3f}')
    print(f'Decision threshold: {DROUGHT_PROBABILITY_THRESHOLD:.2f}')
    print(f'Train metrics: {train_metrics}')
    print(f'Test metrics: {test_metrics}')
    print('Confusion matrix [[no drought, drought], ...]:')
    print(confusion_matrix(y_test, test_prediction))
    print(classification_report(
        y_test,
        test_prediction,
        target_names=['No Drought', 'Drought'],
        zero_division=0,
    ))

    os.makedirs(MODEL_DIR, exist_ok=True)

    with open(os.path.join(MODEL_DIR, 'drought_model.pkl'), 'wb') as f:
        pickle.dump(model, f)

    with open(os.path.join(MODEL_DIR, 'city_encoder.pkl'), 'wb') as f:
        pickle.dump(encoder, f)

    metadata = {
        'feature_columns': FEATURE_COLUMNS,
        'excluded_leakage_features': ['SPI'],
        'decision_threshold': DROUGHT_PROBABILITY_THRESHOLD,
        'validation_strategy': 'temporal_holdout_last_20_percent',
        'temporal_cutoff': cutoff_date.strftime('%Y-%m-%d'),
        'train_rows': int(len(y_train)),
        'test_rows': int(len(y_test)),
        'train_drought_rate': round(float(y_train.mean()), 4),
        'test_drought_rate': round(float(y_test.mean()), 4),
        'train_metrics': train_metrics,
        'test_metrics': test_metrics,
        'model': {
            'type': 'RandomForestClassifier',
            'n_estimators': 500,
            'max_depth': 10,
            'min_samples_leaf': 8,
            'min_samples_split': 20,
            'max_features': 'sqrt',
            'class_weight': 'balanced_subsample',
        },
    }

    with open(MODEL_METADATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f'Model saved to {MODEL_DIR}')
    print(f'Metadata saved to {MODEL_METADATA_PATH}')


if __name__ == '__main__':
    main()
