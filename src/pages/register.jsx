import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sun,
  User,
  Mail,
  Lock,
  ArrowRight,
  House,
  Factory,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import solarBackgroundVideo from "../assets/backgrounds/solar_v.mp4";
import "./register.css";

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    stakeholder_type: "residential",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    navigate("/login", {
      state: { registered: true },
    });
  };

  return (
    <div className="auth-split-page">

      {/* LEFT VIDEO PANEL */}

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
          <h1>Start your solar journey.</h1>
          <p>
            Bring your solar generation, performance
            and insights together in one place.
          </p>
        </div>

        <div className="auth-video-bottom">
          POWERING A CLEANER TOMORROW
        </div>
      </section>

      {/* RIGHT REGISTER PANEL */}

      <section className="auth-form-panel register-form-panel">

        <div className="auth-top-brand">
          <Sun size={23} />
          <span>SolarGrid</span>
        </div>

        <div className="auth-form-card register-form-card">

          <span className="auth-eyebrow">
            GET STARTED
          </span>

          <h1>Create your account.</h1>

          <p className="auth-description">
            Set up your workspace and explore smarter solar analytics.
          </p>

          <form onSubmit={handleSubmit}>

            <label htmlFor="name">Full name</label>

            <div className="auth-field">
              <User size={18} />
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange}
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <label htmlFor="register-email">
              Email address
            </label>

            <div className="auth-field">
              <Mail size={18} />
              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <label htmlFor="register-password">
              Password
            </label>

            <div className="auth-field">
              <Lock size={18} />
              <input
                id="register-password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <label className="stakeholder-heading">
              What best describes you?
            </label>

            <div className="stakeholder-options">

              <label
                className={`stakeholder-option ${
                  form.stakeholder_type === "residential"
                    ? "selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="stakeholder_type"
                  value="residential"
                  checked={form.stakeholder_type === "residential"}
                  onChange={handleChange}
                />
                <House size={21} />
                <span>Residential</span>
              </label>

              <label
                className={`stakeholder-option ${
                  form.stakeholder_type === "solar_farm"
                    ? "selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="stakeholder_type"
                  value="solar_farm"
                  checked={form.stakeholder_type === "solar_farm"}
                  onChange={handleChange}
                />
                <Zap size={21} />
                <span>Solar Farm</span>
              </label>

              <label
                className={`stakeholder-option ${
                  form.stakeholder_type === "industrial"
                    ? "selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="stakeholder_type"
                  value="industrial"
                  checked={form.stakeholder_type === "industrial"}
                  onChange={handleChange}
                />
                <Factory size={21} />
                <span>Industrial</span>
              </label>

            </div>

            {error && (
              <div className="auth-error">{error}</div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight size={18} />}
            </button>

          </form>

          <div className="auth-divider">
            <span>ALREADY REGISTERED?</span>
          </div>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </p>

        </div>

        <p className="auth-panel-footer">
          SOLAR PLANT MONITORING & PERFORMANCE ANALYTICS
        </p>

      </section>
    </div>
  );
}
export default Register;

