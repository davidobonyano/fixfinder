import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { setAuthToken, clearAuthToken, getAuthToken, getMe } from "../utils/api";

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setIsAuthenticated(true);
      // lazy load user
      getMe()
        .then((res) => setUser(res.user))
        .catch(() => {});
    }
  }, []);

  const login = (token, userData) => {
    setAuthToken(token);
    setUser(userData || null);
    setIsAuthenticated(true);
  };
  const logout = () => {
    clearAuthToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
