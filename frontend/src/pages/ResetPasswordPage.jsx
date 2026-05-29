import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import { LockIcon, LoaderIcon, ShieldCheckIcon } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router";

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuthStore();
  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return;
    }
    if (password.length < 6) {
      return;
    }
    setLoading(true);
    const success = await resetPassword(token, password);
    setLoading(false);
    if (success) {
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  return (
    <div className="w-full flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <BorderAnimatedContainer>
          <div className="w-full p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-200 mb-2">Reset Password</h2>
              <p className="text-slate-400 text-sm">Enter your new password below</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="auth-input-label">New Password</label>
                <div className="relative">
                  <LockIcon className="auth-input-icon" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="auth-input-label">Confirm Password</label>
                <div className="relative">
                  <LockIcon className="auth-input-icon" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`input ${password && confirmPassword && password !== confirmPassword ? "border-red-500" : ""}`}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              <button className="auth-btn" type="submit" disabled={loading || password !== confirmPassword}>
                {loading ? (
                  <LoaderIcon className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="auth-link">
                Back to login
              </Link>
            </div>
          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
