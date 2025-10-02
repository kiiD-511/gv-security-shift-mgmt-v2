/* eslint-disable react-refresh/only-export-components */
// src/auth/AuthContext.jsx
import { createContext, useEffect, useState, useContext } from "react";
import { onAuthStateChanged, getIdToken, getIdTokenResult, signOut } from "firebase/auth";
import { auth } from "../firebase";


const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=> {
    return onAuthStateChanged(auth, async (u) => {
      if (!u){
         setUser(null); 
         setRole(null); 
         setToken(null); 
         setLoading(false); 
         return; 
      }
      const [tok, res] = await Promise.all([ getIdToken(u, true), getIdTokenResult(u) ]);
      setUser(u); 
      setToken(tok);
      setRole(res.claims.role || null); // will be mirrored on server as fallback
      setLoading(false);
    });
  },[]);

  /*async function login(email, password) {
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, password);
    setLoading(false);
  }*/
  async function logout() {
    await signOut(auth);
    setUser(null);
    setToken(null);
    setRole(null);
  }
  return <AuthCtx.Provider  
      value={{ user, token, role, loading, logout }}>
      {children}
      </AuthCtx.Provider>
}
