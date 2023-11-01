// SearchPage.js

import React from "react";
import "./Search.css";

function SearchPage() {
  return (
    <div className="search-page">
      <div className="content-section">
        <button className="create-link-button">Create New Link</button>
        <p className="no-link-message">
          There is no link page for the searched link. Links that can be related
          to your search:
        </p>
        <ul className="related-topics">
          <li>Related Topic 1</li>
          <li>Related Topic 2</li>
          <li>Related Topic 3</li>
        </ul>
      </div>
    </div>
  );
}

export default SearchPage;
