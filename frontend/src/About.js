import React from "react";
import "./About.css";

function SearchPage() {
  return (
    <div className="about-page">
      <div className="search-bar">
        {/* Create your search bar here */}
        <input type="text" placeholder="Search..." />
        <button>Search</button>
      </div>
      <div className="content-section">
        {/* Add your content here */}
        <p>*TODO*</p>
      </div>
    </div>
  );
}

export default SearchPage;
