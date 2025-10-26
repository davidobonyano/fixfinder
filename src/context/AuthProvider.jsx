import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { setAuthToken, clearAuthToken, getAuthToken, getMe } from "../utils/api";

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setIsAuthenticated(true);
      // lazy load user
      getMe()
        .then((res) => setUser(res.user))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    setAuthToken(token);
    setUser(userData || null);
    setIsAuthenticated(true);
    setIsLoading(false);
  };
  const logout = () => {
    clearAuthToken();
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
