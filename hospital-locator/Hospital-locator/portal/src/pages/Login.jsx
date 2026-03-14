// portal/src/pages/Login.jsx
// Phone OTP login — no password needed.
// Dev mode: OTP prints in the FastAPI terminal window.

import { useState } from "react";
import { authAPI } from "../services/api";
import { useAuth } from "../services/AuthContext";
import { Button, Input, Card, ErrorBox } from "../components/UI";

export default function Login({ onSuccess }) {
  const { login } = useAuth();
  const [step,    setStep]    = useState("phone"); // "phone" | "otp"
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [devOtp,  setDevOtp]  = useState("");   // shown in dev mode

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) { setError("Enter a valid 10-digit phone number"); return; }
    setLoading(true); setError("");
    try {
      const res = await authAPI.sendOTP(cleaned);
      if (res.dev_otp) setDevOtp(res.dev_otp);  // dev mode: show OTP on screen
      setStep("otp");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true); setError("");
    try {
      const res = await authAPI.verifyOTP(phone.replace(/\D/g, ""), otp);
      login(res.access_token, { id: res.user_id, name: res.name, role: res.role, phone });
      onSuccess?.();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#F8FAFC",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <Card style={{ width:"100%", maxWidth:380 }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🏥</div>
          <h2 style={{ margin:0, color:"#0D3B7A", fontSize:22 }}>MediGuide India</h2>
          <p style={{ color:"#6B7280", fontSize:14, margin:"6px 0 0" }}>
            {step === "phone" ? "Enter your phone number to continue" : `OTP sent to +91 ${phone}`}
          </p>
        </div>

        <ErrorBox message={error} />

        {/* Dev mode OTP hint */}
        {devOtp && (
          <div style={{
            background:"#DCFCE7", border:"1px solid #86EFAC", borderRadius:8,
            padding:"10px 14px", marginBottom:16, textAlign:"center",
          }}>
            <div style={{ fontSize:12, color:"#166534", fontWeight:600 }}>
              🔧 DEV MODE — Your OTP is:
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:"#166534", letterSpacing:8 }}>
              {devOtp}
            </div>
            <div style={{ fontSize:11, color:"#4B5563" }}>
              (Also printed in the FastAPI terminal)
            </div>
          </div>
        )}

        {step === "phone" ? (
          <>
            <Input
              label="Phone Number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="9876543210"
              type="tel"
            />
            <Button onClick={handleSendOTP} loading={loading} fullWidth
              disabled={loading}>
              {loading ? "Sending..." : "Send OTP →"}
            </Button>
          </>
        ) : (
          <>
            <Input
              label="Enter 6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
              placeholder="123456"
              type="text"
            />
            <Button onClick={handleVerifyOTP} fullWidth disabled={loading}>
              {loading ? "Verifying..." : "Verify & Login →"}
            </Button>
            <button onClick={() => { setStep("phone"); setDevOtp(""); setOtp(""); }}
              style={{
                display:"block", margin:"12px auto 0", background:"none",
                border:"none", color:"#1A56A0", cursor:"pointer",
                fontSize:13, fontFamily:"inherit",
              }}>
              ← Change phone number
            </button>
          </>
        )}

        <p style={{ textAlign:"center", fontSize:12, color:"#9CA3AF", marginTop:20, marginBottom:0 }}>
          New users get an account created automatically.
        </p>
      </Card>
    </div>
  );
}
