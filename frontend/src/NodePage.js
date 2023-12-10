// NodePage.js
import React from 'react';

const NodePage = () => {
  return (
    <div>
      <h1>Node Graph</h1>
      <iframe
        title="Node Graph"
        src="/nodegraph.html"
        width="100%"
        height="500px"
        allowFullScreen
      />
    </div>
  );
};

export default NodePage;
