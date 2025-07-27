"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/app/lib/api";

export default function UnverifiedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        const data = await res.json();
        
        // If user is already verified, redirect to dashboard
        if (data.emailVerified) {
          router.replace("/dashboard");
          return;
        }

        setCheckingAuth(false);
      } catch (err) {
        localStorage.removeItem("token");
        router.replace("/login");
      }
    };

    checkAuth();
  }, [router]);

  const handleResend = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) throw new Error("Not logged in");
      
      console.log("[handleResend] Sending request with token:", token.substring(0, 20) + "...");
      
      const res = await fetch(`${API_BASE_URL}/auth/request-email-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}), // Add empty JSON body
      });
      
      console.log("[handleResend] Response status:", res.status);
      
      const data = await res.json();
      console.log("[handleResend] Response data:", data);
      
      if (!res.ok) {
        console.error("[handleResend] Error response:", data);
        throw new Error(data.error || "Failed to send verification email");
      }
      
      setMessage("Verification email sent! Please check your inbox."); //set text secondary
    } catch (err: any) {
      console.error("[handleResend] Caught error:", err);
      setError(err.message || "Failed to send verification email"); //set text secondary
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md bg-surface/80 backdrop-blur-lg rounded-2xl border border-border/50 shadow-2xl p-10 text-center">
          <h1 className="text-2xl font-bold mb-6 text-error">Email Not Verified</h1>
          <p className="mb-4 text-text">
            Your account email has not been verified yet. Please check your inbox for a verification email and follow the instructions to activate your account.
          </p>
          <p className="mb-6 text-text-secondary">
            If you did not receive the email, check your spam folder or click below to resend the verification email.
          </p>
          <button
            className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 mb-4 shadow"
            onClick={handleResend}
            disabled={loading}
          >
            {loading ? "Sending..." : "Resend Verification Email"}
          </button>
          {message && <div className="text-success text-sm mb-2">{message}</div>}
          {error && <div className="text-error text-sm mb-2">{error}</div>}
          <Link href="/login" className="text-primary hover:underline font-medium block">Back to Login</Link>
        </div>
      </div>
      <div className="mb-8 text-center w-full">
        <Link href="/" className="text-text-secondary text-sm hover:underline">&larr; Back to home</Link>
      </div>
    </div>
  );
} 