// Badge.js
import React, { useState, useEffect } from "react";
import { makeAuthRequest } from "../services/makeRequests";
import "../styles/badge.css";
export function Badge({ userId }) {
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    if (userId) {
      makeAuthRequest("/get-user-badges", { params: { userId } })
        .then((data) => setBadges(data.badges))
        .catch((err) => console.error("Error fetching user badges:", err));
    }
  }, [userId]);

  if (!badges.length) return null;

  return (
    <div className="badge-container">
      {badges.map((badge) => (
        <span key={badge.id} className="badge">
          {badge.badge_name}
        </span>
      ))}
    </div>
  );
}
