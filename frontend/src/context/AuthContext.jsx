import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then(setUser)
        .catch(() => { api.setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    api.setToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.usuario);
    return data.usuario;
  };

  const register = async (formData) => {
    const data = await api.register(formData);
    api.setToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.usuario);
    return data.usuario;
  };

  const logout = () => {
    api.setToken(null);
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
