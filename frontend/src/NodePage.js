// NodePage.js
import React from "react";
import { useLocation } from "react-router-dom";

const NodePage = () => {
  const location = useLocation();
  const linkId = location.state?.linkId;
  const token = location.state?.token;

  return (
    <div>
      <h1>Node Graph</h1>
      {linkId ? (
        <iframe
          title="Node Graph"
          src={`/nodegraph.html?selectedLink=${encodeURIComponent(
            linkId
          )}&token=${encodeURIComponent(token)}`}
          width="100%"
          height="500px"
          allowFullScreen
        />
      ) : (
        <p>Link ID not provided</p>
      )}
    </div>
  );
};

export default NodePage;
