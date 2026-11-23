import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Sun,
  Zap,
  Database,
  Search,
} from "lucide-react";
import "./PerformanceView.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function formatValue(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: digits,
  });
}

function formatTimestamp(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function PerformanceView({ selectedPlant = 1 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("power");

  const fetchInverters = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/farm/inverters?plant=${selectedPlant}`
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.detail || "Unable to load inverter performance."
        );
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInverters();
  }, [selectedPlant]);

  const inverters = data?.inverters || [];

  const filteredInverters = useMemo(() => {
    const filtered = inverters.filter((item) =>
      item.inverter_id.toLowerCase().includes(search.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      if (sortBy === "power") {
        return b.latest_ac_power - a.latest_ac_power;
      }

      if (sortBy === "peak") {
        return b.peak_ac_power - a.peak_ac_power;
      }

      return a.inverter_id.localeCompare(b.inverter_id);
    });
  }, [inverters, search, sortBy]);

  const summary = useMemo(() => {
    if (!inverters.length) {
      return {
        average: null,
        peak: null,
        belowMedian: 0,
      };
    }

    const powers = inverters.map((item) => item.latest_ac_power);

    return {
      average:
        powers.reduce((sum, value) => sum + value, 0) /
        powers.length,
      peak: Math.max(...powers),
      belowMedian: inverters.filter(
        (item) => item.peer_status === "Below peer median"
      ).length,
    };
  }, [inverters]);

  return (
    <section className="performance-page">
      <header className="performance-header">
        <div>
          <span className="performance-eyebrow">
            PLANT INTELLIGENCE
          </span>
          <h2>Plant performance</h2>
          <p>
            Understand how individual inverters are contributing
            to your solar farm.
          </p>
        </div>

        <button
          className="performance-refresh"
          onClick={fetchInverters}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "performance-spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="performance-data-note">
        <Database size={16} />
        <span>
          Historical dataset · Plant {selectedPlant}
          {data?.latest_timestamp
            ? ` · Latest observation ${formatTimestamp(data.latest_timestamp)}`
            : ""}
        </span>
      </div>

      {error && (
        <div className="performance-error">
          {error}
          <button onClick={fetchInverters}>Try again</button>
        </div>
      )}

      {loading ? (
        <div className="performance-empty">
          <RefreshCw size={22} className="performance-spin" />
          Loading inverter records...
        </div>
      ) : data ? (
        <>
          <div className="performance-summary">
            <article>
              <span className="performance-summary-icon green">
                <Sun size={18} />
              </span>
              <div>
                <small>Inverters monitored</small>
                <strong>{data.inverter_count}</strong>
              </div>
            </article>

            <article>
              <span className="performance-summary-icon blue">
                <Zap size={18} />
              </span>
              <div>
                <small>Average recorded power</small>
                <strong>{formatValue(summary.average)}</strong>
              </div>
            </article>

            <article>
              <span className="performance-summary-icon orange">
                <Activity size={18} />
              </span>
              <div>
                <small>Highest recorded power</small>
                <strong>{formatValue(summary.peak)}</strong>
              </div>
            </article>
          </div>

          <div className="performance-section">
            <div className="performance-section-heading">
              <div>
                <h3>Inverter performance</h3>
                <p>
                  Compare the latest recorded output across inverters.
                </p>
              </div>

              <span className="performance-count">
                {filteredInverters.length} of {inverters.length}
              </span>
            </div>

            <div className="performance-controls">
              <label className="performance-search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search inverter..."
                />
              </label>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                aria-label="Sort inverters"
              >
                <option value="power">Sort by latest power</option>
                <option value="peak">Sort by peak power</option>
                <option value="name">Sort by inverter name</option>
              </select>
            </div>

            <div className="performance-table-wrap">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Inverter</th>
                    <th>Latest AC power</th>
                    <th>Peak recorded power</th>
                    <th>Daily yield</th>
                    <th>Peer comparison</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInverters.map((item) => (
                    <tr key={item.inverter_id}>
                      <td>
                        <span className="performance-inverter-name">
                          <span className="performance-inverter-icon">
                            <Zap size={15} />
                          </span>
                          {item.inverter_id}
                        </span>
                      </td>

                      <td>{formatValue(item.latest_ac_power)}</td>
                      <td>{formatValue(item.peak_ac_power)}</td>
                      <td>{formatValue(item.daily_yield)}</td>

                      <td>
                        <span
                          className={`performance-peer ${
                            item.peer_status === "Below peer median"
                              ? "below"
                              : item.peer_status === "Above peer median"
                                ? "above"
                                : "equal"
                          }`}
                        >
                          {item.peer_status === "Below peer median" ? (
                            <ArrowDown size={13} />
                          ) : item.peer_status === "Above peer median" ? (
                            <ArrowUp size={13} />
                          ) : null}
                          {item.peer_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredInverters.length === 0 && (
                <div className="performance-no-results">
                  No matching inverters found.
                </div>
              )}
            </div>

            <p className="performance-table-footnote">
              Power values use the dataset's AC_POWER units.
              Daily yield is shown as recorded in the source dataset.
            </p>
          </div>

          <div className="performance-insight">
            <div className="performance-summary-icon green">
              <Activity size={18} />
            </div>

            <div>
              <strong>What this comparison means</strong>
              <p>
                {summary.belowMedian} of {inverters.length} inverters
                have latest output below the peer median at the
                reference timestamp. This is a comparison signal,
                not a confirmed equipment fault. Investigate it
                alongside sunlight, operating conditions and
                inverter history.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

export default PerformanceView;
