import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import { MailIcon, LoaderIcon, ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { forgotPassword } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await forgotPassword(email);
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="w-full flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <BorderAnimatedContainer>
          <div className="w-full p-8">
            <Link to="/login" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-6">
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="text-sm">Back to login</span>
            </Link>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MailIcon className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-200 mb-2">Forgot Password?</h2>
              <p className="text-slate-400 text-sm">Enter your email and we'll send you a reset link</p>
            </div>

            {submitted ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <MailIcon className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-slate-300">Check your email for a password reset link.</p>
                <Link to="/login" className="auth-link">
                  Return to login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="auth-input-label">Email Address</label>
                  <div className="relative">
                    <MailIcon className="auth-input-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <button className="auth-btn" type="submit" disabled={loading}>
                  {loading ? (
                    <LoaderIcon className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>
            )}
          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
