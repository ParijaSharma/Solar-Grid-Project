import { useEffect, useMemo, useState } from "react";
import {
  Activity,AlertCircle,BrainCircuit,CheckCircle2,Database,Play,RefreshCw,TrendingUp,Zap,
} from "lucide-react";
import {
  fetchFarmHistory,fetchFarmMetrics,fetchFarmReplay,startFarmReplay,fetchFarmPrediction,
} from "../api/client";
import "./ForecastView.css";
import "./FarmReplayView.css";

function formatNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString("en-IN", {
    maximumFractionDigits: digits,
  });
}

function getMetricCards(metrics) {
  if (!metrics || typeof metrics !== "object") return [];
  const cards = [];
  function walk(object, prefix = "") {
    Object.entries(object).forEach(([key, value]) => {
      const label = prefix
        ? `${prefix} / ${key}`
        : key;

      if (
        typeof value === "number" &&
        Number.isFinite(value)
      ) {
        cards.push({
          label: label.replaceAll("_", " "),
          value,
        });
      } else if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        walk(value, label);
      }
    });
  }

  walk(metrics);
  return cards.slice(0, 8);
}

function GenerationChart({ records }) {
  const chartRecords = useMemo(
    () => records.slice(-100),
    [records]
  );

  if (!chartRecords.length) {
    return (
      <div className="farm-chart-empty">
        Run a replay to view generation data.
      </div>
    );
  }

  const values = chartRecords.flatMap((record) => [
    Number(record.actual_ac_power) || 0,
    Number(record.predicted_ac_power) || 0,
  ]);

  const maxValue = Math.max(...values, 1);
  const width = 900;
  const height = 280;
  const padding = 24;

  const getPoints = (key) =>
    chartRecords
      .map((record, index) => {
        const x =
          padding +
          (index / Math.max(chartRecords.length - 1, 1)) *
            (width - padding * 2);

        const value = Number(record[key]) || 0;
        const y =
          height -
          padding -
          (value / maxValue) * (height - padding * 2);

        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="farm-chart-wrapper">
      <div className="farm-chart-legend">
        <span>
          <i className="legend-dot actual-dot" />
          Actual generation
        </span>
        <span>
          <i className="legend-dot predicted-dot" />
          Predicted generation
        </span>
      </div>

      <svg
        className="farm-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Actual and predicted solar generation chart"
      >
        {[0, 1, 2, 3, 4].map((line) => {
          const y =
            padding +
            (line / 4) * (height - padding * 2);

          return (
            <line
              key={line}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              className="farm-chart-gridline"
            />
          );
        })}

        <polyline
          points={getPoints("actual_ac_power")}
          className="farm-chart-line actual-line"
        />

        <polyline
          points={getPoints("predicted_ac_power")}
          className="farm-chart-line predicted-line"
        />
      </svg>

      <div className="farm-chart-axis-labels">
        <span>Earlier records</span>
        <span>Latest records</span>
      </div>

      <p className="farm-chart-note">
        Showing the latest {chartRecords.length} records.
        Values use the dataset's AC_POWER units.
      </p>
    </div>
  );
}

function ForecastView({ selectedPlant = 1 }) {
  const [metrics, setMetrics] = useState(null);
  const [records, setRecords] = useState([]);
  const [replayId, setReplayId] = useState("");
  const [replaySummary, setReplaySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replayLoading, setReplayLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [inputs, setInputs] = useState({
    timestamp: "2020-06-11T12:00",
    irradiation: "0.75",
    ambient_temperature: "30",
    module_temperature: "42",
  });

  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");
      setNotice("");
      setRecords([]);
      setReplayId("");
      setReplaySummary(null);

      const metricsResponse = await fetchFarmMetrics();

      if (cancelled) return;

      if (metricsResponse.error) {
        setError(metricsResponse.error);
      } else {
        setMetrics(metricsResponse.data);
      }

      if (Number(selectedPlant) === 2) {
        const historyResponse = await fetchFarmHistory(2, 200);

        if (cancelled) return;

        if (historyResponse.error) {
          setError(historyResponse.error);
        } else {
          setRecords(historyResponse.data?.records || []);
          setNotice(
            "Plant 2 is being evaluated using the Plant 1 trained model. These are cross-plant evaluation results."
          );
        }
      } else {
        setNotice(
          "Plant 1 is the primary training and historical replay plant."
        );
      }

      if (!cancelled) setLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedPlant]);

  const metricCards = useMemo(
    () => getMetricCards(metrics),
    [metrics]
  );

  async function handleReplay() {
    if (Number(selectedPlant) !== 1) return;

    setReplayLoading(true);
    setError("");
    setReplaySummary(null);
    setRecords([]);

    const response = await startFarmReplay(200);

    if (response.error) {
      setError(response.error);
      setReplayLoading(false);
      return;
    }

    const replay = response.data;
    setReplayId(replay.replay_id);

    const result = await fetchFarmReplay(replay.replay_id);

    if (result.error) {
      setError(result.error);
    } else {
      setRecords(result.data?.records || []);
      setReplaySummary(replay);
    }

    setReplayLoading(false);
  }

  async function handleRefresh() {
    if (Number(selectedPlant) === 1 && replayId) {
      setReplayLoading(true);
      setError("");

      const response = await fetchFarmReplay(replayId);

      if (response.error) {
        setError(response.error);
      } else {
        setRecords(response.data?.records || []);
      }

      setReplayLoading(false);
      return;
    }

    if (Number(selectedPlant) === 2) {
      setLoading(true);
      const response = await fetchFarmHistory(2, 200);

      if (response.error) {
        setError(response.error);
      } else {
        setRecords(response.data?.records || []);
      }

      setLoading(false);
    }
  }

  async function handlePrediction(event) {
    event.preventDefault();
    setError("");
    setPrediction(null);

    if (Number(selectedPlant) !== 1) {
      setError(
        "Manual prediction is currently available for Plant 1 only."
      );
      return;
    }

    const irradiation = Number(inputs.irradiation);
    const ambient = Number(inputs.ambient_temperature);
    const module = Number(inputs.module_temperature);

    if (
      !inputs.timestamp ||
      !Number.isFinite(irradiation) ||
      !Number.isFinite(ambient) ||
      !Number.isFinite(module)
    ) {
      setError("Enter valid values for all prediction fields.");
      return;
    }

    setPredictionLoading(true);

    const response = await fetchFarmPrediction({
      timestamp: new Date(inputs.timestamp).toISOString(),
      irradiation,
      ambient_temperature: ambient,
      module_temperature: module,
    });

    if (response.error) {
      setError(response.error);
    } else {
      setPrediction(response.data);
    }

    setPredictionLoading(false);
  }

  return (
    <section className="farm-forecast-page">
      <div className="farm-forecast-header">
        <div>
          <span className="farm-eyebrow">
            SOLARHUB AI / FARM MODEL ANALYTICS
          </span>
          <h2>Forecast &amp; Model Evaluation</h2>
          <p>
            Historical generation replay, model performance,
            and cross-plant evaluation.
          </p>
        </div>

        <span className="farm-plant-label">
          Plant {selectedPlant}
        </span>
      </div>

      <div className="farm-info-banner">
        <Database size={18} />
        <span>
          Historical dataset replay is used here. This is not
          live IoT telemetry.
        </span>
      </div>

      <article className="farm-panel">
        <div className="farm-panel-heading">
          <div className="farm-panel-icon">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h3>Farm-level Random Forest</h3>
            <p>
              Predicts aggregated solar farm AC power using
              weather and time-based features.
            </p>
          </div>
          <span className="farm-status-ready">
            <CheckCircle2 size={14} />
            Model trained
          </span>
        </div>

        <div className="farm-model-details">
          <div>
            <span>ALGORITHM</span>
            <strong>Random Forest Regressor</strong>
          </div>
          <div>
            <span>TARGET</span>
            <strong>Aggregated AC_POWER</strong>
          </div>
          <div>
            <span>TRAINING PLANT</span>
            <strong>Plant 1</strong>
          </div>
          <div>
            <span>INPUT FEATURES</span>
            <strong>8 engineered features</strong>
          </div>
        </div>
      </article>

      <article className="farm-panel">
        <div className="farm-panel-heading">
          <div className="farm-panel-icon">
            <Activity size={20} />
          </div>
          <div>
            <h3>Model Performance</h3>
            <p>
              Metrics from the trained model evaluation.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="farm-muted">Loading model metrics...</p>
        ) : metricCards.length ? (
          <div className="farm-metrics-grid">
            {metricCards.map((metric, index) => (
              <div className="farm-metric-card" key={index}>
                <span>{metric.label}</span>
                <strong>{formatNumber(metric.value, 3)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="farm-muted">
            No model metrics were returned by the backend.
          </p>
        )}
      </article>

      <article className="farm-panel">
        <div className="farm-panel-heading">
          <div className="farm-panel-icon">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3>Actual vs Predicted Generation</h3>
            <p>
              Compare historical generation with model predictions.
            </p>
          </div>
        </div>

        {notice && (
          <div className="farm-notice">
            <AlertCircle size={16} />
            <span>{notice}</span>
          </div>
        )}

        <div className="farm-replay-controls">
          {Number(selectedPlant) === 1 ? (
            <button
              className="farm-primary-button"
              onClick={handleReplay}
              disabled={replayLoading}
            >
              {replayLoading ? (
                <RefreshCw size={16} className="farm-spin" />
              ) : (
                <Play size={16} />
              )}
              {replayLoading
                ? "Running historical replay..."
                : "Run historical replay"}
            </button>
          ) : (
            <span className="farm-cross-eval-label">
              Cross-plant evaluation
            </span>
          )}

          <button
            className="farm-secondary-button"
            onClick={handleRefresh}
            disabled={loading || replayLoading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {replaySummary && (
          <div className="farm-replay-summary">
            <div>
              <span>REPLAY COMPLETED</span>
              <strong>
                {replaySummary.records_processed} records
              </strong>
            </div>
            <div>
              <span>REPLAY MAE</span>
              <strong>{formatNumber(replaySummary.mae, 3)}</strong>
            </div>
            <div>
              <span>DATA SOURCE</span>
              <strong>Historical CSV</strong>
            </div>
          </div>
        )}

        {records.length > 0 ? (
          <GenerationChart records={records} />
        ) : (
          <div className="farm-chart-empty">
            {loading || replayLoading
              ? "Loading generation records..."
              : Number(selectedPlant) === 1
                ? "Run the historical replay to load records from MongoDB."
                : "No Plant 2 evaluation records available."}
          </div>
        )}

        {records.length > 0 && (
          <div className="farm-record-count">
            Displaying {records.length} records
            {replayId && (
              <span> · Replay ID: {replayId}</span>
            )}
          </div>
        )}
      </article>

      <article className="farm-panel">
        <div className="farm-panel-heading">
          <div className="farm-panel-icon">
            <Zap size={20} />
          </div>
          <div>
            <h3>Manual Prediction Sandbox</h3>
            <p>
              Test the farm-level model with custom weather inputs.
            </p>
          </div>
        </div>

        {Number(selectedPlant) === 1 ? (
          <form
            className="farm-prediction-form"
            onSubmit={handlePrediction}
          >
            <label>
              Timestamp
              <input
                type="datetime-local"
                value={inputs.timestamp}
                onChange={(event) =>
                  setInputs({
                    ...inputs,
                    timestamp: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Irradiation
              <input
                type="number"
                min="0"
                max="1.5"
                step="0.01"
                value={inputs.irradiation}
                onChange={(event) =>
                  setInputs({
                    ...inputs,
                    irradiation: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Ambient temperature (°C)
              <input
                type="number"
                step="0.1"
                value={inputs.ambient_temperature}
                onChange={(event) =>
                  setInputs({
                    ...inputs,
                    ambient_temperature: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Module temperature (°C)
              <input
                type="number"
                step="0.1"
                value={inputs.module_temperature}
                onChange={(event) =>
                  setInputs({
                    ...inputs,
                    module_temperature: event.target.value,
                  })
                }
                required
              />
            </label>

            <button
              className="farm-primary-button"
              type="submit"
              disabled={predictionLoading}
            >
              {predictionLoading
                ? "Predicting..."
                : "Predict farm generation"}
            </button>
          </form>
        ) : (
          <p className="farm-muted">
            Manual prediction is available for the primary
            training plant only.
          </p>
        )}

        {prediction && (
          <div className="farm-prediction-result">
            <span>PREDICTED FARM AC POWER</span>
            <strong>
              {formatNumber(prediction.predicted_ac_power, 3)}
            </strong>
            <small>
              {prediction.unit || "AC_POWER dataset units"}
            </small>
          </div>
        )}
      </article>

      {error && (
        <div className="farm-error">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
export default ForecastView;
