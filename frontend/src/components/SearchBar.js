import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkLinkExistence } from "../services/links";
import { SearchField } from "@aws-amplify/ui-react";

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    console.log("Form submitted with search term:", searchTerm);
    try {
      const response = await checkLinkExistence(searchTerm);
      console.log("Response from checkLinkExistence:", response);

      // Check if the link exists and retrieve its ID
      if (response && response.exists && response.id) {
        navigate(`/links/${encodeURIComponent(response.id)}`);
        console.log("Link exists with ID:", response.id);
      } else {
        console.log("Link does not exist or no ID provided");
        navigate(`/search`, { state: { searchTerm } });
      }
    } catch (error) {
      console.error("Error while checking link existence:", error);
      // Handle the error appropriately
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      console.log("Enter key pressed");
      handleSearchSubmit(event);
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearchSubmit}>
        <SearchField
          onKeyDown={handleKeyDown}
          label="Search"
          placeholder="Search here..."
          labelHidden={false}
          className="search-field"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <button type="submit" style={{ display: "none" }}>
          Submit
        </button>
      </form>
    </div>
  );
}

export default SearchComponent;
