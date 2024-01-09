import React from "react";
import { useLocation } from "react-router-dom";
import NodeGraph from "./components/NodeGraph"; // Import your NodeGraph component

const NodePage = () => {
  const location = useLocation();
  const linkId = location.state?.linkId;
  const token = location.state?.token;

  return (
    <div>
      <h1>Node Graph</h1>
      {linkId ? (
        <NodeGraph selectedLinkId={linkId} token={token} />
      ) : (
        <p>Link ID not provided</p>
      )}
    </div>
  );
};

export default NodePage;
