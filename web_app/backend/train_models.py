import os
import pickle

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)
DATA_PATH = os.path.join(os.path.dirname(BASE_DIR), 'data')
FEATURES_PATH = os.path.join(DATA_PATH, 'morocco_climate_features.csv')
MODEL_DIR = os.path.join(SCRIPT_DIR, 'models')

FEATURE_COLUMNS = [
    'city_encoded', 'precipitation_sum', 'temperature_2m_mean', 'et0_fao_evapotranspiration',
    'water_balance', 'SPI', 'precip_lag1', 'precip_lag2', 'precip_lag3', 'temp_lag1', 'temp_lag2',
    'temp_lag3', 'precip_rolling3', 'precip_rolling6', 'temp_rolling3', 'et0_rolling3',
    'month', 'season_encoded'
]


def main() -> None:
    df = pd.read_csv(FEATURES_PATH)

    encoder = LabelEncoder()
    df['city_encoded'] = encoder.fit_transform(df['city'].astype(str))

    # SPI drought starts at -1.0. This target keeps the model tied to the
    # accepted drought definition instead of dataset-specific percentile bins.
    df['drought_target'] = (df['drought_label'] == 'Drought').astype(int)
    df = df.dropna(subset=FEATURE_COLUMNS + ['drought_target']).reset_index(drop=True)

    X = df[FEATURE_COLUMNS].fillna(0)
    y = df['drought_target']

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=300,
        random_state=42,
        class_weight='balanced',
        n_jobs=-1,
        min_samples_leaf=2,
    )
    model.fit(X_train, y_train)

    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f'Train accuracy: {train_score:.4f}')
    print(f'Test accuracy: {test_score:.4f}')
    print('Confusion matrix [[no drought, drought], ...]:')
    print(confusion_matrix(y_test, model.predict(X_test)))
    print(classification_report(
        y_test,
        model.predict(X_test),
        target_names=['No Drought', 'Drought'],
        zero_division=0,
    ))

    os.makedirs(MODEL_DIR, exist_ok=True)

    with open(os.path.join(MODEL_DIR, 'drought_model.pkl'), 'wb') as f:
        pickle.dump(model, f)

    with open(os.path.join(MODEL_DIR, 'city_encoder.pkl'), 'wb') as f:
        pickle.dump(encoder, f)


if __name__ == '__main__':
    main()
