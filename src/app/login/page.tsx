"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../providers";
import { useRouter } from "next/navigation";
import { Bus, Lock, User, Eye, EyeOff, UserPlus, LogIn } from "lucide-react";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"driver" | "admin">("driver");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const loginMutation = useMutation(api.auth.login);
  const createUserMutation = useMutation(api.auth.createUser);
  const { login } = useAuth();
  const router = useRouter();

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setName("");
    setRole("driver");
    setError("");
    setSuccess("");
  };

  const switchMode = (newMode: Mode) => {
    resetForm();
    setMode(newMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginMutation({ username, password });
      login({
        id: result.id,
        username: result.username,
        name: result.name,
        role: result.role,
      });

      if (result.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/driver");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !name) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await createUserMutation({
        username,
        password,
        name,
        role,
      });
      setSuccess("Account created! You can now sign in.");
      setTimeout(() => {
        switchMode("login");
        setUsername(username);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 50%, #F8FAFC 100%)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Bus size={32} color="white" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>SafariBus</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          {mode === "login" ? "Sign in to your account" : "Create a new account"}
        </p>
      </div>

      {/* Tab toggle */}
      <div className="tab-nav" style={{ width: "100%", maxWidth: 360, marginBottom: 16 }}>
        <button
          className={`tab-btn ${mode === "login" ? "active" : ""}`}
          onClick={() => switchMode("login")}
          type="button"
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <LogIn size={15} />
            Sign In
          </span>
        </button>
        <button
          className={`tab-btn ${mode === "register" ? "active" : ""}`}
          onClick={() => switchMode("register")}
          type="button"
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <UserPlus size={15} />
            Register
          </span>
        </button>
      </div>

      <form
        onSubmit={mode === "login" ? handleLogin : handleRegister}
        className="card"
        style={{ width: "100%", maxWidth: 360, padding: 24 }}
      >
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "#FEF2F2",
              color: "#DC2626",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "#ECFDF5",
              color: "#059669",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {success}
          </div>
        )}

        {/* Full Name — register only */}
        {mode === "register" && (
          <div style={{ marginBottom: 16 }}>
            <label className="label">Full Name</label>
            <div style={{ position: "relative" }}>
              <User
                size={18}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                className="input"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: 42 }}
                autoComplete="name"
              />
            </div>
          </div>
        )}

        {/* Username */}
        <div style={{ marginBottom: 16 }}>
          <label className="label">Username</label>
          <div style={{ position: "relative" }}>
            <User
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ paddingLeft: 42 }}
              autoComplete="username"
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: mode === "register" ? 16 : 24 }}>
          <label className="label">Password</label>
          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type={showPassword ? "text" : "password"}
              className="input"
              placeholder={mode === "register" ? "Min 6 characters" : "Enter password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: 42, paddingRight: 42 }}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--text-muted)",
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Role selector — register only */}
        {mode === "register" && (
          <div style={{ marginBottom: 24 }}>
            <label className="label">Account Type</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setRole("driver")}
                className="btn"
                style={{
                  flex: 1,
                  background: role === "driver" ? "var(--primary)" : "var(--bg)",
                  color: role === "driver" ? "white" : "var(--text)",
                  border: `1px solid ${role === "driver" ? "var(--primary)" : "var(--border)"}`,
                  padding: "10px 12px",
                  minHeight: 44,
                }}
              >
                🚌 Driver
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className="btn"
                style={{
                  flex: 1,
                  background: role === "admin" ? "var(--primary)" : "var(--bg)",
                  color: role === "admin" ? "white" : "var(--text)",
                  border: `1px solid ${role === "admin" ? "var(--primary)" : "var(--border)"}`,
                  padding: "10px 12px",
                  minHeight: 44,
                }}
              >
                ⚙️ Admin
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block btn-large"
          disabled={loading}
        >
          {loading
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Sign In"
              : "Create Account"}
        </button>

        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Register here
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
