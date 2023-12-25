import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { makeAuthRequest, makeRequest } from "./services/makeRequests";

const LinkDetailsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSearchTerm = location.state?.searchTerm || "";

  const [linkName] = useState(initialSearchTerm);
  const [relatedKeywords, setRelatedKeywords] = useState([]);
  const [linkDescription, setLinkDescription] = useState("");
  const [allLinks, setAllLinks] = useState([]);
  const [filteredLinks, setFilteredLinks] = useState([]);
  const [selectedLinks, setSelectedLinks] = useState(new Set());
  const [userId, setUserId] = useState(null);

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
        <div>{linkName}</div> {/* Display the link name as read-only */}
      </div>
      <textarea
        value={linkDescription}
        onChange={(e) => setLinkDescription(e.target.value)}
        placeholder="Link Description"
      />
      <div>
        {relatedKeywords.map((keyword, index) => (
          <input
            key={index}
            type="text"
            value={keyword}
            onChange={(e) => handleKeywordChange(e, index)}
            placeholder="Keyword"
          />
        ))}
        {relatedKeywords.length < 10 && (
          <button onClick={handleKeywordAdd}>Add Keyword</button>
        )}
      </div>
      <div>
        <h2>Related Links</h2>
        {filteredLinks.map((link) => (
          <div key={link.id}>
            {link.name}
            <input
              type="checkbox"
              checked={selectedLinks.has(link.id)}
              onChange={() => handleLinkSelection(link.id)}
            />
          </div>
        ))}
      </div>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};
export default LinkDetailsPage;
