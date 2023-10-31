import React from "react";
import "./Search.css";

function SearchPage() {
  return (
    <div className="search-page">
      <div className="search-bar">
        <input type="text" placeholder="Search..." />
        <button>Search</button>
      </div>
      <div className="content-section">
        <button className="create-link-button">Create Link</button>
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
