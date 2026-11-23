
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Clock3,
  Database,
  Play,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  fetchFarmHistory,
  fetchFarmReplay,
  startFarmReplay,
} from "../api/client";
import "./ForecastView.css";

function formatNumber(value, digits = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: digits,
  });
}

function GenerationChart({ records }) {
  const chartRecords = useMemo(
    () => records.slice(-100),
    [records]
  );

  if (!chartRecords.length) {
    return (
      <div className="forecast-empty">
        <Activity size={24} />
        <p>No generation records available.</p>
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
    <div className="forecast-chart-wrapper">
      <div className="forecast-legend">
        <span>
          <i className="forecast-dot actual" />
          Actual generation
        </span>
        <span>
          <i className="forecast-dot predicted" />
          Predicted generation
        </span>
      </div>

      <svg
        className="forecast-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Actual and predicted solar generation comparison"
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
              className="forecast-gridline"
            />
          );
        })}

        <polyline
          points={getPoints("actual_ac_power")}
          className="forecast-line actual-line"
        />

        <polyline
          points={getPoints("predicted_ac_power")}
          className="forecast-line predicted-line"
        />
      </svg>

      <div className="forecast-axis-labels">
        <span>Earlier records</span>
        <span>Latest records</span>
      </div>

      <p className="forecast-chart-note">
        Showing the latest {chartRecords.length} records.
        Values use the dataset's AC_POWER units.
      </p>
    </div>
  );
}

function ForecastView({ selectedPlant = 1 }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replayLoading, setReplayLoading] = useState(false);
  const [error, setError] = useState("");
  const [replayId, setReplayId] = useState("");
  const [replaySummary, setReplaySummary] = useState(null);

  const isPrimaryPlant = Number(selectedPlant) === 1;

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError("");
      setRecords([]);
      setReplayId("");
      setReplaySummary(null);

      const response = await fetchFarmHistory(
        Number(selectedPlant),
        200
      );

      if (cancelled) return;

      if (response.error) {
        setError(response.error);
      } else {
        setRecords(response.data?.records || []);
      }

      setLoading(false);
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedPlant]);

  const summary = useMemo(() => {
    if (!records.length) return null;

    const actual = records.map(
      (record) => Number(record.actual_ac_power) || 0
    );

    const predicted = records.map(
      (record) => Number(record.predicted_ac_power) || 0
    );

    const errors = records.map(
      (record) =>
        Math.abs(
          Number(record.actual_ac_power) -
            Number(record.predicted_ac_power)
        )
    );

    const average = (values) =>
      values.reduce((sum, value) => sum + value, 0) /
      values.length;

    return {
      averageActual: average(actual),
      averagePredicted: average(predicted),
      mae: average(errors),
      count: records.length,
    };
  }, [records]);

  async function handleReplay() {
    if (!isPrimaryPlant) return;

    setReplayLoading(true);
    setError("");
    setReplaySummary(null);

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
    setLoading(true);
    setError("");

    if (isPrimaryPlant && replayId) {
      const response = await fetchFarmReplay(replayId);

      if (response.error) {
        setError(response.error);
      } else {
        setRecords(response.data?.records || []);
      }
    } else {
      const response = await fetchFarmHistory(
        Number(selectedPlant),
        200
      );

      if (response.error) {
        setError(response.error);
      } else {
        setRecords(response.data?.records || []);
      }
    }

    setLoading(false);
  }

  return (
    <section className="forecast-page">
      <header className="forecast-header">
        <div>
          <span className="forecast-eyebrow">
            SOLARHUB AI / ENERGY
          </span>
          <h2>Energy Forecast</h2>
          <p>
            Understand expected generation and compare it
            with recorded plant performance.
          </p>
        </div>

        <span className="forecast-plant-tag">
          Plant {selectedPlant}
        </span>
      </header>

      <div className="forecast-data-notice">
        <Database size={18} />
        <div>
          <strong>Historical analysis</strong>
          <span>
            Results are based on recorded datasets and model
            evaluation. This is not a live or future weather forecast.
          </span>
        </div>
      </div>

      <div className="forecast-section-heading">
        <div>
          <h3>Generation overview</h3>
          <p>
            A comparison of recorded and model-estimated AC power.
          </p>
        </div>

        <button
          className="forecast-refresh"
          onClick={handleRefresh}
          disabled={loading || replayLoading}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="forecast-loading">
          <RefreshCw size={20} className="forecast-spin" />
          Loading generation records...
        </div>
      ) : summary ? (
        <div className="forecast-summary-grid">
          <article className="forecast-summary-card">
            <div className="forecast-summary-icon">
              <Zap size={19} />
            </div>
            <span>Average actual generation</span>
            <strong>{formatNumber(summary.averageActual)}</strong>
            <small>AC_POWER dataset units</small>
          </article>

          <article className="forecast-summary-card">
            <div className="forecast-summary-icon">
              <TrendingUp size={19} />
            </div>
            <span>Average predicted generation</span>
            <strong>{formatNumber(summary.averagePredicted)}</strong>
            <small>AC_POWER dataset units</small>
          </article>

          <article className="forecast-summary-card">
            <div className="forecast-summary-icon">
              <Activity size={19} />
            </div>
            <span>Mean absolute error</span>
            <strong>{formatNumber(summary.mae)}</strong>
            <small>Average absolute difference</small>
          </article>

          <article className="forecast-summary-card">
            <div className="forecast-summary-icon">
              <Database size={19} />
            </div>
            <span>Records analysed</span>
            <strong>{formatNumber(summary.count, 0)}</strong>
            <small>Historical observations</small>
          </article>
        </div>
      ) : (
        <div className="forecast-empty">
          <Database size={24} />
          <p>No historical evaluation records found.</p>
        </div>
      )}

      <article className="forecast-panel">
        <div className="forecast-panel-heading">
          <div>
            <h3>Actual vs predicted generation</h3>
            <p>
              See how closely model estimates follow recorded generation.
            </p>
          </div>
          <span className="forecast-history-label">
            <Clock3 size={14} />
            Historical data
          </span>
        </div>

        <GenerationChart records={records} />

        {replaySummary && (
          <div className="forecast-replay-result">
            <div>
              <span>Replay completed</span>
              <strong>
                {formatNumber(replaySummary.records_processed, 0)} records
              </strong>
            </div>
            <div>
              <span>Replay MAE</span>
              <strong>{formatNumber(replaySummary.mae)}</strong>
            </div>
            <div>
              <span>Source</span>
              <strong>Historical CSV</strong>
            </div>
          </div>
        )}

        {replayId && (
          <p className="forecast-replay-id">
            Replay ID: {replayId}
          </p>
        )}
      </article>

      <article className="forecast-panel forecast-action-panel">
        <div className="forecast-action-icon">
          <Play size={19} />
        </div>

        <div className="forecast-action-content">
          <h3>Update generation analysis</h3>
          <p>
            {isPrimaryPlant
              ? "Run a historical replay to process recorded Plant 1 data and retrieve the results."
              : "Plant 2 results use a model trained on Plant 1. Treat this as cross-plant evaluation, not a validated Plant 2 forecast."}
          </p>
        </div>

        {isPrimaryPlant ? (
          <button
            className="forecast-run-button"
            onClick={handleReplay}
            disabled={replayLoading}
          >
            {replayLoading ? (
              <RefreshCw size={16} className="forecast-spin" />
            ) : (
              <Play size={16} />
            )}
            {replayLoading ? "Running replay..." : "Run replay"}
          </button>
        ) : (
          <span className="forecast-limited-label">
            Cross-plant evaluation
          </span>
        )}
      </article>

      {!isPrimaryPlant && (
        <div className="forecast-plant-notice">
          <AlertCircle size={17} />
          <span>
            Plant 2 predictions are not independently validated.
            Model performance on this plant may differ significantly
            from Plant 1.
          </span>
        </div>
      )}

      {error && (
        <div className="forecast-error">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}

export default ForecastView;
