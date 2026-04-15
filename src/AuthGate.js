import React, { useEffect, useState } from "react";
import { getCurrentUser, signInWithRedirect, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

const REDIRECT_KEY = "ap_auth_redirect";

// Save the current deep link before Cognito sends us away
function saveIntendedUrl() {
  const url = window.location.pathname + window.location.search;
  // Only worth saving if it's not just the root/portfolio
  if (url && url !== "/" && url !== "/portfolio") {
    sessionStorage.setItem(REDIRECT_KEY, url);
  }
}

// After login, navigate to the saved URL if one exists
function restoreIntendedUrl() {
  const url = sessionStorage.getItem(REDIRECT_KEY);
  if (url) {
    sessionStorage.removeItem(REDIRECT_KEY);
    window.history.replaceState(null, "", url);
  }
}

export default function AuthGate({ children }) {
  const [state, setState] = useState("loading"); // 'loading' | 'authenticated' | 'unauthenticated'

  useEffect(() => {
    checkUser();

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect") {
        restoreIntendedUrl();
        checkUser();
      }
      if (payload.event === "signInWithRedirect_failure") setState("unauthenticated");
    });

    return unsubscribe;
  }, []);

  async function checkUser() {
    try {
      await getCurrentUser();
      setState("authenticated");
    } catch {
      setState("unauthenticated");
    }
  }

  if (state === "loading") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0d1b2a",
        fontFamily: "'Inter', sans-serif", color: "#a0b4c8", fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  if (state === "unauthenticated") {
    // Save where the user was trying to go before we redirect them to login
    saveIntendedUrl();

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh", background: "#0d1b2a",
        fontFamily: "'Inter', sans-serif", gap: 24,
      }}>
        <img src="/ampledge_white.svg" alt="Ampledge" style={{ width: 48, opacity: 0.9 }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#ffffff", fontWeight: 800, fontSize: 20, letterSpacing: "0.01em", marginBottom: 6 }}>
            American Pledge
          </div>
          <div style={{ color: "#a0b4c8", fontSize: 13 }}>Investment Performance Report</div>
        </div>
        <button
          onClick={() => signInWithRedirect()}
          style={{
            background: "#c0392b", color: "#fff", border: "none", borderRadius: 6,
            padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            letterSpacing: "0.03em",
          }}
        >
          Sign In
        </button>
      </div>
    );
  }

  return children;
}

export { signOut };
