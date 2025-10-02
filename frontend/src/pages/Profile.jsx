/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useApi } from "../api";

export default function Profile() {
  const api = useApi();
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/whoami/")
      .then(setMe)
      .catch((err) => {
        console.error(err);
        setError("Failed to load profile");
      });
  }, []);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!me) return <p>Loading profile...</p>;

  return (
    <div>
      <h1>My Profile</h1>
      <ul>
        <li><b>UID:</b> {me.uid}</li>
        <li><b>Email:</b> {me.email}</li>
        <li><b>Name:</b> {me.full_name}</li>
        <li><b>Role:</b> {me.role}</li>
      </ul>
    </div>
  );
}
