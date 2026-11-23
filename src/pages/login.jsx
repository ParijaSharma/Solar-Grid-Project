import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sun, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import solarBackgroundVideo from "../assets/backgrounds/solar_v.mp4";
import "./login.css";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(form.email, form.password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="auth-split-page">

      <section className="auth-video-panel">
        <video autoPlay loop muted playsInline>
          <source src={solarBackgroundVideo} type="video/mp4" />
        </video>

        <div className="auth-video-overlay" />

        <Link to="/" className="auth-video-logo">
          <Sun size={25} />
          <span>SolarGrid</span>
        </Link>

        <div className="auth-video-content">
          <span>THE NEXT GENERATION OF SOLAR</span>
          <h1>Make every ray count.</h1>
          <p>
            Understand your energy. Discover patterns.
            Make smarter solar decisions.
          </p>
        </div>

        <div className="auth-video-bottom">
          POWERING A CLEANER TOMORROW
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-top-brand">
          <Sun size={23} />
          <span>SolarGrid</span>
        </div>

        <div className="auth-form-card">

          <span className="auth-eyebrow">
            WELCOME BACK
          </span>

          <h1>Sign in to your account.</h1>

          <p className="auth-description">
            Your solar insights are just one step away.
          </p>

          <form onSubmit={handleSubmit}>

            <label htmlFor="email">Email address</label>

            <div className="auth-field">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <label htmlFor="password">Password</label>

            <div className="auth-field">
              <Lock size={18} />
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <div className="auth-error">{error}</div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={18} />}
            </button>

          </form>

          <div className="auth-divider">
            <span>NEW TO SOLARGRID?</span>
          </div>

          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/register">Create account</Link>
          </p>

        </div>
        <p className="auth-panel-footer">
          SOLAR PLANT MONITORING & PERFORMANCE ANALYTICS
        </p>
      </section>
    </div>
  );
}
export default Login;

