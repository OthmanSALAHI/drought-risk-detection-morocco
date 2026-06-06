import json
import pickle
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.ticker import PercentFormatter
from sklearn.metrics import (
    accuracy_score,
    auc,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.preprocessing import LabelEncoder


ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "morocco_climate_features.csv"
MODEL_PATH = ROOT / "web_app" / "backend" / "models" / "drought_model.pkl"
META_PATH = ROOT / "web_app" / "backend" / "models" / "model_metadata.json"
OUT_DIR = ROOT / "metrics"

COLORS = {
    "navy": "#27364b",
    "teal": "#248f8d",
    "rust": "#c76f3a",
    "gold": "#d8a23a",
    "violet": "#6f5aa7",
    "red": "#b94e48",
    "gray": "#7c8288",
}


def savefig(path: Path) -> None:
    plt.savefig(path, dpi=180, bbox_inches="tight", facecolor=plt.gcf().get_facecolor())
    plt.close()


def style_axis(ax) -> None:
    ax.grid(True, axis="y", alpha=0.22, linewidth=0.8)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)


def metric_summary(y_true, y_pred, y_probability) -> dict[str, float]:
    return {
        "Accuracy": accuracy_score(y_true, y_pred),
        "Balanced Acc.": balanced_accuracy_score(y_true, y_pred),
        "Precision": precision_score(y_true, y_pred, zero_division=0),
        "Recall": recall_score(y_true, y_pred, zero_division=0),
        "F1": f1_score(y_true, y_pred, zero_division=0),
        "ROC AUC": roc_auc_score(y_true, y_probability),
    }


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)

    with META_PATH.open("r", encoding="utf-8") as f:
        metadata = json.load(f)

    with MODEL_PATH.open("rb") as f:
        model = pickle.load(f)

    feature_columns = metadata["feature_columns"]
    threshold = float(metadata.get("decision_threshold", 0.4))
    cutoff = pd.Timestamp(metadata["temporal_cutoff"])

    df = pd.read_csv(DATA_PATH)
    df["time"] = pd.to_datetime(df["time"])
    df["city_encoded"] = LabelEncoder().fit_transform(df["city"].astype(str))
    df["drought_target"] = (df["drought_label"] == "Drought").astype(int)
    df = (
        df.dropna(subset=feature_columns + ["drought_target"])
        .sort_values("time")
        .reset_index(drop=True)
    )

    train_mask = df["time"] <= cutoff
    test_mask = df["time"] > cutoff
    X_train = df.loc[train_mask, feature_columns].fillna(0)
    X_test = df.loc[test_mask, feature_columns].fillna(0)
    y_train = df.loc[train_mask, "drought_target"]
    y_test = df.loc[test_mask, "drought_target"]

    train_prob = model.predict_proba(X_train)[:, 1]
    test_prob = model.predict_proba(X_test)[:, 1]
    train_pred = (train_prob >= threshold).astype(int)
    test_pred = (test_prob >= threshold).astype(int)

    train_metrics = metric_summary(y_train, train_pred, train_prob)
    test_metrics = metric_summary(y_test, test_pred, test_prob)

    cm = confusion_matrix(y_test, test_pred)
    roc_fpr, roc_tpr, _ = roc_curve(y_test, test_prob)
    roc_auc = roc_auc_score(y_test, test_prob)
    pr_precision, pr_recall, _ = precision_recall_curve(y_test, test_prob)
    pr_auc = auc(pr_recall, pr_precision)

    thresholds = np.linspace(0.05, 0.95, 91)
    threshold_df = pd.DataFrame(
        {
            "threshold": t,
            "precision": precision_score(y_test, test_prob >= t, zero_division=0),
            "recall": recall_score(y_test, test_prob >= t, zero_division=0),
            "f1": f1_score(y_test, test_prob >= t, zero_division=0),
            "balanced_accuracy": balanced_accuracy_score(y_test, test_prob >= t),
        }
        for t in thresholds
    )

    plt.rcParams.update(
        {
            "figure.facecolor": "#f7f6f2",
            "axes.facecolor": "#ffffff",
            "axes.edgecolor": "#d7d2c8",
            "axes.labelcolor": "#242424",
            "axes.titlecolor": "#242424",
            "xtick.color": "#343434",
            "ytick.color": "#343434",
            "font.family": "DejaVu Sans",
            "font.size": 11,
        }
    )

    metric_names = list(test_metrics.keys())
    x = np.arange(len(metric_names))
    width = 0.38

    fig = plt.figure(figsize=(16, 10), constrained_layout=True)
    gs = fig.add_gridspec(2, 3, height_ratios=[1, 1.05])
    fig.suptitle(
        "Drought Model Performance After Leakage Fix",
        fontsize=22,
        fontweight="bold",
        color=COLORS["navy"],
    )
    fig.text(
        0.5,
        0.943,
        (
            f"Temporal validation: train <= {cutoff.date()}, test > {cutoff.date()} | "
            f"SPI excluded from inputs | threshold={threshold:.2f}"
        ),
        ha="center",
        fontsize=11,
        color="#555555",
    )

    ax = fig.add_subplot(gs[0, 0])
    ax.bar(x - width / 2, [train_metrics[m] for m in metric_names], width, label="Train", color=COLORS["teal"])
    ax.bar(x + width / 2, [test_metrics[m] for m in metric_names], width, label="Future holdout", color=COLORS["rust"])
    ax.set_ylim(0, 1.05)
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.set_xticks(x)
    ax.set_xticklabels(metric_names, rotation=30, ha="right")
    ax.set_title("Train vs Future Holdout")
    ax.legend(frameon=False)
    style_axis(ax)

    ax = fig.add_subplot(gs[0, 1])
    im = ax.imshow(cm, cmap="YlGnBu")
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, f"{cm[i, j]:,}", ha="center", va="center", fontsize=16, fontweight="bold", color="#14213d")
    ax.set_xticks([0, 1], ["Pred: No drought", "Pred: Drought"])
    ax.set_yticks([0, 1], ["Actual: No drought", "Actual: Drought"])
    ax.set_title("Future Holdout Confusion Matrix")
    fig.colorbar(im, ax=ax, shrink=0.75)

    ax = fig.add_subplot(gs[0, 2])
    ax.plot(threshold_df["threshold"], threshold_df["precision"], label="Precision", color=COLORS["violet"], linewidth=2.2)
    ax.plot(threshold_df["threshold"], threshold_df["recall"], label="Recall", color=COLORS["red"], linewidth=2.2)
    ax.plot(threshold_df["threshold"], threshold_df["f1"], label="F1", color=COLORS["teal"], linewidth=2.2)
    ax.axvline(threshold, color=COLORS["navy"], linestyle="--", linewidth=1.8, label=f"Chosen {threshold:.2f}")
    ax.set_ylim(0, 1.05)
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.set_xlabel("Decision threshold")
    ax.set_title("Threshold Tradeoff")
    ax.legend(frameon=False)
    style_axis(ax)

    ax = fig.add_subplot(gs[1, 0])
    ax.plot(roc_fpr, roc_tpr, color=COLORS["teal"], linewidth=2.5, label=f"ROC AUC {roc_auc:.3f}")
    ax.plot([0, 1], [0, 1], color=COLORS["gray"], linestyle=":", linewidth=1.5)
    ax.set_xlabel("False positive rate")
    ax.set_ylabel("True positive rate")
    ax.set_title("ROC Curve")
    ax.legend(frameon=False, loc="lower right")
    style_axis(ax)

    ax = fig.add_subplot(gs[1, 1])
    ax.plot(pr_recall, pr_precision, color=COLORS["rust"], linewidth=2.5, label=f"PR AUC {pr_auc:.3f}")
    ax.axhline(y_test.mean(), color=COLORS["gray"], linestyle=":", linewidth=1.5, label=f"Baseline {y_test.mean():.1%}")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Precision-Recall Curve")
    ax.legend(frameon=False)
    style_axis(ax)

    ax = fig.add_subplot(gs[1, 2])
    if hasattr(model, "feature_importances_"):
        importances = pd.Series(model.feature_importances_, index=feature_columns).sort_values(ascending=True).tail(10)
        ax.barh(importances.index, importances.values, color=COLORS["gold"])
        ax.set_title("Top Feature Importances")
        ax.set_xlabel("Importance")
        style_axis(ax)
    else:
        ax.axis("off")
        ax.text(0.5, 0.5, "Feature importances are unavailable for this model.", ha="center", va="center")

    savefig(OUT_DIR / "model_performance_metrics.png")

    fig, ax = plt.subplots(figsize=(8, 7))
    fig.suptitle("Future Holdout Confusion Matrix", fontsize=18, fontweight="bold", color=COLORS["navy"])
    im = ax.imshow(cm, cmap="YlGnBu")
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, f"{cm[i, j]:,}", ha="center", va="center", fontsize=22, fontweight="bold", color="#14213d")
    ax.set_xticks([0, 1], ["Predicted\nNo Drought", "Predicted\nDrought"])
    ax.set_yticks([0, 1], ["Actual\nNo Drought", "Actual\nDrought"])
    ax.set_xlabel("Model prediction")
    ax.set_ylabel("Observed class")
    fig.colorbar(im, ax=ax, shrink=0.82)
    recall_text = test_metrics["Recall"]
    precision_text = test_metrics["Precision"]
    fig.text(
        0.5,
        0.02,
        f"Threshold={threshold:.2f} | Recall drought={recall_text:.1%} | Precision drought={precision_text:.1%}",
        ha="center",
        color="#555555",
    )
    savefig(OUT_DIR / "model_confusion_matrix.png")

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    fig.suptitle("Model Ranking Quality on Future Holdout", fontsize=18, fontweight="bold", color=COLORS["navy"])
    axes[0].plot(roc_fpr, roc_tpr, color=COLORS["teal"], linewidth=2.8, label=f"ROC AUC {roc_auc:.3f}")
    axes[0].plot([0, 1], [0, 1], color=COLORS["gray"], linestyle=":", linewidth=1.5)
    axes[0].set_xlabel("False positive rate")
    axes[0].set_ylabel("True positive rate")
    axes[0].set_title("ROC Curve")
    axes[0].legend(frameon=False, loc="lower right")
    style_axis(axes[0])
    axes[1].plot(pr_recall, pr_precision, color=COLORS["rust"], linewidth=2.8, label=f"PR AUC {pr_auc:.3f}")
    axes[1].axhline(y_test.mean(), color=COLORS["gray"], linestyle=":", linewidth=1.5, label=f"Baseline {y_test.mean():.1%}")
    axes[1].set_xlabel("Recall")
    axes[1].set_ylabel("Precision")
    axes[1].set_title("Precision-Recall Curve")
    axes[1].legend(frameon=False)
    style_axis(axes[1])
    savefig(OUT_DIR / "model_roc_pr_curves.png")

    if hasattr(model, "feature_importances_"):
        importances = pd.Series(model.feature_importances_, index=feature_columns).sort_values(ascending=True)
        fig, ax = plt.subplots(figsize=(10, 8))
        fig.suptitle("Random Forest Feature Importance", fontsize=18, fontweight="bold", color=COLORS["navy"])
        ax.barh(importances.index, importances.values, color=COLORS["teal"])
        ax.set_xlabel("Mean decrease in impurity")
        ax.set_title("SPI is intentionally excluded to avoid leakage")
        style_axis(ax)
        savefig(OUT_DIR / "model_feature_importance.png")

    fig, ax = plt.subplots(figsize=(11, 7))
    fig.suptitle("Drought Threshold Tradeoff", fontsize=18, fontweight="bold", color=COLORS["navy"])
    ax.plot(threshold_df["threshold"], threshold_df["precision"], label="Precision", color=COLORS["violet"], linewidth=2.5)
    ax.plot(threshold_df["threshold"], threshold_df["recall"], label="Recall", color=COLORS["red"], linewidth=2.5)
    ax.plot(threshold_df["threshold"], threshold_df["f1"], label="F1", color=COLORS["teal"], linewidth=2.5)
    ax.plot(
        threshold_df["threshold"],
        threshold_df["balanced_accuracy"],
        label="Balanced accuracy",
        color=COLORS["gold"],
        linewidth=2.5,
    )
    ax.axvline(threshold, color=COLORS["navy"], linestyle="--", linewidth=2, label=f"Chosen threshold {threshold:.2f}")
    ax.set_xlabel("Probability threshold for Drought")
    ax.set_ylabel("Score")
    ax.set_ylim(0, 1.05)
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.legend(frameon=False, ncol=2)
    style_axis(ax)
    savefig(OUT_DIR / "model_threshold_tradeoff.png")

    fig, ax = plt.subplots(figsize=(11, 7))
    fig.suptitle("Generalization Check", fontsize=18, fontweight="bold", color=COLORS["navy"])
    metrics_to_show = ["Accuracy", "Balanced Acc.", "Precision", "Recall", "F1", "ROC AUC"]
    x = np.arange(len(metrics_to_show))
    ax.bar(x - width / 2, [train_metrics[m] for m in metrics_to_show], width, color=COLORS["teal"], label="Train")
    ax.bar(x + width / 2, [test_metrics[m] for m in metrics_to_show], width, color=COLORS["rust"], label="Future holdout")
    for idx, metric in enumerate(metrics_to_show):
        gap = train_metrics[metric] - test_metrics[metric]
        ax.text(
            idx,
            max(train_metrics[metric], test_metrics[metric]) + 0.025,
            f"gap {gap:+.2f}",
            ha="center",
            fontsize=9,
            color="#555555",
        )
    ax.set_xticks(x)
    ax.set_xticklabels(metrics_to_show, rotation=20, ha="right")
    ax.set_ylim(0, 1.12)
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.legend(frameon=False)
    style_axis(ax)
    fig.text(
        0.5,
        0.02,
        f"Train rows={len(y_train):,}, holdout rows={len(y_test):,}, holdout drought rate={y_test.mean():.1%}",
        ha="center",
        color="#555555",
    )
    savefig(OUT_DIR / "model_generalization_gap.png")

    print("Generated metric images:")
    for path in [
        OUT_DIR / "model_performance_metrics.png",
        OUT_DIR / "model_confusion_matrix.png",
        OUT_DIR / "model_roc_pr_curves.png",
        OUT_DIR / "model_feature_importance.png",
        OUT_DIR / "model_threshold_tradeoff.png",
        OUT_DIR / "model_generalization_gap.png",
    ]:
        print(path)


if __name__ == "__main__":
    main()
