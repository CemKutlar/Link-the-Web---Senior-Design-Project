import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { makeAuthRequest, makeRequest } from "./services/makeRequests";
import "./styles/LinkCreate.css";
import NodeGraph from "./components/NodeGraph";

const LinkDetailsPage = () => {
  const location = useLocation();
  const token = location.state?.token;
  const navigate = useNavigate();
  const initialSearchTerm = location.state?.searchTerm || "";

  const [linkName] = useState(initialSearchTerm);
  const [relatedKeywords, setRelatedKeywords] = useState([]);
  const [linkDescription, setLinkDescription] = useState("");
  const [allLinks, setAllLinks] = useState([]);
  const [filteredLinks, setFilteredLinks] = useState([]);
  const [selectedLinks, setSelectedLinks] = useState(new Set());
  const [userId, setUserId] = useState(null);

  const [hoveredLink, setHoveredLink] = useState(null);
  const [highlightedLinks, setHighlightedLinks] = useState(new Set());
  const [hoveredLinkDescription, setHoveredLinkDescription] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    fetchAllLinks();
    fetchUserId();
  }, []);

  const fetchUserId = async () => {
    try {
      const response = await makeAuthRequest("/get-current-user", {
        method: "GET",
      });
      setUserId(response.userId);
    } catch (error) {
      console.error("Error fetching user ID:", error);
    }
  };

  const fetchAllLinks = async () => {
    try {
      const response = await makeRequest("/links", {
        method: "GET",
      });
      setAllLinks(response);
      setFilteredLinks(response);
    } catch (error) {
      console.error("Error fetching links:", error);
    }
  };

  const fetchFilteredLinks = async (keywords) => {
    try {
      const response = await makeAuthRequest("/search-links-by-keywords", {
        method: "POST",
        data: { keywords },
      });
      setFilteredLinks(response);
    } catch (error) {
      console.error("Error fetching filtered links:", error);
    }
  };
  const handleLinkHover = async (linkId, event) => {
    try {
      const relatedLinks = await makeRequest(`/related-links-hover/${linkId}`, {
        method: "GET",
      });
      const hoveredLink = relatedLinks.find((link) => link.id === linkId);

      setHoveredLinkDescription(hoveredLink ? hoveredLink.description : "");
      setHighlightedLinks(new Set(relatedLinks.map((link) => link.id)));

      // Position the tooltip near the cursor
      setPosition({
        x: event.clientX,
        y: event.clientY,
      });
    } catch (error) {
      console.error("Error fetching related links for hovered link:", error);
    }
  };

  useEffect(() => {
    if (relatedKeywords.length > 0) {
      fetchFilteredLinks(relatedKeywords);
    } else {
      setFilteredLinks(allLinks);
    }
  }, [relatedKeywords, allLinks]);

  const handleKeywordChange = (event, index) => {
    const newKeywords = [...relatedKeywords];
    newKeywords[index] = event.target.value;
    setRelatedKeywords(newKeywords);
  };

  const handleKeywordAdd = () => {
    if (relatedKeywords.length < 10) {
      setRelatedKeywords([...relatedKeywords, ""]);
    }
  };

  const handleLinkSelection = (linkId) => {
    const newSelectedLinks = new Set(selectedLinks);
    if (newSelectedLinks.has(linkId)) {
      newSelectedLinks.delete(linkId);
    } else {
      newSelectedLinks.add(linkId);
    }
    setSelectedLinks(newSelectedLinks);
  };

  const handleSubmit = async () => {
    try {
      const newLinkData = {
        name: linkName,
        description: linkDescription,
        creator_user_id: userId,
        keywords: relatedKeywords.filter((kw) => kw.trim() !== ""),
        relatedLinks: Array.from(selectedLinks),
      };

      await makeAuthRequest("/create-link", {
        method: "POST",
        data: newLinkData,
      });

      navigate("/success-page"); // Redirect or show success message
    } catch (error) {
      console.error("Error submitting link data:", error);
    }
  };

  return (
    <div>
      <h1>Create New Link</h1>
      <div>
        <label>Link Name:</label>
        <div className="link-name">{linkName}</div>{" "}
        {/* Display the link name as read-only */}
      </div>
      <textarea
        className="link-description"
        value={linkDescription}
        onChange={(e) => setLinkDescription(e.target.value)}
        placeholder="Link Description"
      />
      <div className="keywords-container">
        {relatedKeywords.map((keyword, index) => (
          <input
            key={index}
            className="keyword-input"
            type="text"
            value={keyword}
            onChange={(e) => handleKeywordChange(e, index)}
            placeholder="Keyword"
          />
        ))}
        {relatedKeywords.length < 10 && (
          <button className="add-keyword-button" onClick={handleKeywordAdd}>
            Add Keyword
          </button>
        )}
      </div>
      <div className="related-links-container">
        <h2>Related Links</h2>
        {filteredLinks.map((link) => (
          <div
            key={link.id}
            className={`related-link-item ${
              highlightedLinks.has(link.id) ? "highlighted" : ""
            }`}
            onMouseEnter={(e) => {
              if (hoverTimeoutRef.current)
                clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = setTimeout(
                () => handleLinkHover(link.id, e),
                1000
              ); // Delay 1 second
            }}
            onMouseLeave={() => {
              if (hoverTimeoutRef.current)
                clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
              setHoveredLinkDescription("");
            }}
          >
            {link.name}
            <input
              className="related-link-checkbox"
              type="checkbox"
              checked={selectedLinks.has(link.id)}
              onChange={() => handleLinkSelection(link.id)}
            />
            <NodeGraph selectedLinkId={link.id} token={token} />
          </div>
        ))}
      </div>
      <button className="submit-button" onClick={handleSubmit}>
        Submit
      </button>
      {hoveredLinkDescription && (
        <div
          className="tooltip"
          style={{
            left: `${position.x}px`,
            top: `${position.y * 1.5}px`,
            position: "absolute",
            // Additional styling...
          }}
        >
          {hoveredLinkDescription}
        </div>
      )}
    </div>
  );
};
export default LinkDetailsPage;
