// portal/src/services/AuthContext.jsx
// Global login state. Wrap your app in <AuthProvider>.
// Use useAuth() in any page to get current user / login / logout.

import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on page reload
  useEffect(() => {
    const saved = localStorage.getItem("mg_user");
    const token = localStorage.getItem("mg_token");
    if (saved && token) {
      setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("mg_token", token);
    localStorage.setItem("mg_user",  JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("mg_token");
    localStorage.removeItem("mg_user");
    setUser(null);
  };

  const isLoggedIn = !!user;
  const isStaff    = user && ["doctor","nurse","receptionist","admin"].includes(user.role);
  const isAdmin    = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isLoggedIn, isStaff, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
