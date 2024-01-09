import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { makeRequest, makeAuthRequest } from "../services/makeRequests";
import { useNavigate } from "react-router-dom";

function getMidpoint(x1, y1, x2, y2) {
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
  };
}

const NodeGraph = ({ selectedLinkId, token }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  // const [selectedNode1, setSelectedNode1] = useState(null);
  // const [selectedNode2, setSelectedNode2] = useState(null);
  const [shortestPath, setShortestPath] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);

  const popupRef = useRef();
  const svgRef = useRef();
  const tooltipRef = useRef();
  // const [line, setLine] = useState(null);
  const navigate = useNavigate();
  const [votePopup, setVotePopup] = useState({
    visible: false,
    edge: null,
    position: { x: 0, y: 0 },
  });
  const [voteCounts, setVoteCounts] = useState({ upvote: 0, downvote: 0 });

  // Function to fetch and update vote counts
  const fetchAndUpdateVoteCounts = async (edge) => {
    try {
      const counts = await makeRequest(
        `/edge-vote-counts?linkId=${edge.source.id}&relatedLinkId=${edge.target.id}`
      );
      setVoteCounts({
        upvote: counts.upvote || 0,
        downvote: counts.downvote || 0,
      });
    } catch (error) {
      console.error("Error fetching vote counts:", error);
    }
  };

  // Function to handle voting
  const voteForEdge = async (edge, voteType) => {
    console.log("########", edge.source.id);
    try {
      await makeAuthRequest("/vote-edge", {
        method: "POST",
        data: {
          link_id: edge.source.id,
          related_link_id: edge.target.id,
          vote_type: voteType,
        },
      });
      fetchAndUpdateVoteCounts(edge); // Update vote counts after voting
      hideVotePopup();
    } catch (error) {
      console.error("Error voting:", error);
    }
  };
  useEffect(() => {
    // Function to hide the popup if clicked outside
    const handleClickOutside = (event) => {
      if (
        votePopup.visible &&
        popupRef.current &&
        !popupRef.current.contains(event.target)
      ) {
        hideVotePopup();
      }
    };

    // Add when the popup is visible
    if (votePopup.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Remove when the component is unmounted or the popup is hidden
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [votePopup.visible, popupRef]);

  // Function to handle vote popup display
  const xOffset = -100; // Adjust as needed for the x-axis
  const yOffset = -50; // Adjust as needed for the y-axis

  const showVotePopup = (edge) => {
    // Calculate the midpoint of the edge
    const midX = (edge.source.x + edge.target.x) / 2;
    const midY = (edge.source.y + edge.target.y) / 2;

    // Get the bounding rectangle of the SVG element
    const svgRect = svgRef.current.getBoundingClientRect();

    // Adjust the position for the popup to be offset from the midpoint
    // and to account for the bounding rectangle of the SVG
    const positionX = midX + svgRect.left;
    const positionY = midY + svgRect.top + window.scrollY;

    // Draw a line from the midpoint of the edge to the position of the popup
    const newLine = d3;
    // .select(svgRef.current)
    // .append("line")
    // .attr("x1", midX)
    // .attr("y1", midY)
    // .attr("x2", 600) // Assuming position.x is where the popup will appear
    // .attr("y2", 500) // Assuming position.y is where the popup will appear
    // .attr("stroke", "#333")
    // .attr("stroke-width", 2)
    // .attr("marker-end", "url(#arrowhead)");

    // Save the new line in the state
    // setLine(newLine);

    // Update the position state for the popup
    setVotePopup({
      visible: true,
      edge: edge,
      position: { x: positionX, y: positionY },
      // line: newLine, // Save the line reference in the state
    });

    // Fetch vote counts for the edge
    fetchAndUpdateVoteCounts(edge);
  };

  const transformDataForD3 = (data) => {
    const nodes = new Map();
    const links = [];

    data.forEach((link) => {
      if (!nodes.has(link.link_id)) {
        nodes.set(link.link_id, {
          id: link.link_id,
          name: link.link_name,
          description: link.link_description,
        });
      }
      if (!nodes.has(link.related_link_id)) {
        nodes.set(link.related_link_id, {
          id: link.related_link_id,
          name: link.related_link_name,
          description: link.related_link_description,
        });
      }
      links.push({ source: link.link_id, target: link.related_link_id });
    });

    return { nodes: Array.from(nodes.values()), links };
  };

  // Function to hide vote popup
  const hideVotePopup = () => {
    // Remove the line when hiding the popup

    // Hide the popup
    setVotePopup({ visible: false, edge: null, position: { x: 0, y: 0 } });
  };

  // useEffect(() => {
  //   // Draw the arrow pointing to the popup after the popup's position is updated
  //   if (votePopup.visible) {
  //     // Assuming the popupRef is already positioned in the DOM
  //     const popupRect = popupRef.current.getBoundingClientRect();
  //     const popupX = popupRect.left + window.scrollX + popupRect.width / 2;
  //     const popupY = popupRect.top + window.scrollY;

  //     drawLineToPopup(votePopup.edge, { x: popupX, y: popupY });
  //   }
  // }, [votePopup]);

  // // ...

  // const drawLineToPopup = (edge, popupPosition) => {
  //   // Remove any existing lines
  //   d3.select(svgRef.current).selectAll(".popup-line").remove();

  //   // Draw a line from the edge to the popup position
  //   const line = d3
  //     .select(svgRef.current)
  //     .append("line")
  //     .classed("popup-line", true)
  //     .attr(
  //       "x1",
  //       getMidpoint(edge.source.x, edge.source.y, edge.target.x, edge.target.y)
  //         .x
  //     )
  //     .attr(
  //       "y1",
  //       getMidpoint(edge.source.x, edge.source.y, edge.target.x, edge.target.y)
  //         .y
  //     )
  //     .attr("x2", popupPosition.x)
  //     .attr("y2", popupPosition.y)
  //     .attr("stroke", "black")
  //     .attr("stroke-width", 2)
  //     .attr("marker-end", "url(#arrowhead)");

  //   setLine(line); // Save the line reference in the state
  // };

  // Handler for right-click on a node
  const handleRightClickNode = (nodeId) => {
    setSelectedNodes((prevSelectedNodes) => {
      if (prevSelectedNodes.length === 0) {
        // Select the first node
        return [nodeId];
      } else if (
        prevSelectedNodes.length === 1 &&
        prevSelectedNodes[0] !== nodeId
      ) {
        // Select the second node if it's different from the first
        return [prevSelectedNodes[0], nodeId];
      } else {
        // Reset if the same node is clicked or for the third click
        return [];
      }
    });
  };

  useEffect(() => {
    const nodes = svgRef.current.querySelectorAll("circle");
    nodes.forEach((node) => {
      node.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        const nodeId = event.currentTarget.getAttribute("data-id");
        handleRightClickNode(nodeId);
      });
    });

    // Cleanup function to remove event listeners
    return () => {
      nodes.forEach((node) => {
        node.removeEventListener("contextmenu", (event) => {
          // You need to prevent the default here as well
          event.preventDefault();
          handleRightClickNode(event.currentTarget.getAttribute("data-id"));
        });
      });
    };
    // Dependencies array, ensure to include all dependencies the effect uses
  }, [graphData, setSelectedNodes]);

  useEffect(() => {
    if (selectedNodes.length === 2) {
      const [startId, endId] = selectedNodes;
      const path = dijkstra(graphData.nodes, graphData.links, startId, endId);
      setShortestPath(path.map((nodeId) => `${nodeId}`));
      // Reset selection after finding the path
      setSelectedNodes([]);
    }
  }, [selectedNodes, graphData.nodes, graphData.links]);

  useEffect(() => {
    console.log("Selected Nodes:", selectedNodes);
  }, [selectedNodes]);

  // Draw graph function
  const drawGraph = (data) => {
    console.log("Node graph çiziliyor");
    const width = 800;
    const height = 600;
    const nodeRadius = 10;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    // Define arrowhead marker
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 5)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#000")
      .style("stroke", "none");

    const tooltip = d3.select(tooltipRef.current);

    const simulation = d3
      .forceSimulation(data.nodes)
      .force(
        "link",
        d3
          .forceLink(data.links)
          .id((d) => d.id)
          .distance(50)
      )
      .force(
        "charge",
        d3
          .forceManyBody()
          .distanceMax(height / 2)
          .strength(-400)
      )
      .force("collide", d3.forceCollide(20).iterations(10))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .style("stroke", "#aaa")

      .style("stroke-width", 3) // Thicker edges
      .style("cursor", "pointer") // Cursor pointer on hover
      .style("stroke", (d) =>
        shortestPath.includes(d.source.id) && shortestPath.includes(d.target.id)
          ? "red"
          : "#aaa"
      );
    let linkId = "";
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", nodeRadius)
      .attr("data-id", (d) => d.id)
      .style("fill", "#69b3a2")
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        linkId = d.id;
        tooltip
          .style("display", "block")
          .html(`Name: ${d.name}<br>Description: ${d.description}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.style("display", "none");
      })
      .on("click", function (d) {
        // Navigate to the link page corresponding to the clicked node
        navigate(`/links/${linkId}`);
      })
      .on("contextmenu", function (event, d) {
        console.log("Node right-clicked");
        event.preventDefault(); // Prevent default context menu
        // handleRightClickNode(d.id);
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    link.on("click", function (event, d) {
      // Stop the click from propagating to the SVG canvas
      event.stopPropagation();

      // Calculate the position for the popup
      const x = (d.source.x + d.target.x) / 2;
      const y = (d.source.y + d.target.y) / 2;

      // Show the voting popup
      showVotePopup(d, { x: x, y: y });
    });
  };

  // Fetch graph data and draw it
  useEffect(() => {
    let isMounted = true;
    // Fetch graph data and set graphData state
    const fetchDataAndDrawGraph = async () => {
      try {
        const response = await fetch(
          `http://localhost:3002/related-links/${selectedLinkId}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const relatedLinksData = await response.json();
        const newGraphData = transformDataForD3(relatedLinksData);
        console.log("Fetched data:", newGraphData);
        if (isMounted) {
          setGraphData(newGraphData);
          drawGraph(newGraphData);
        }
      } catch (error) {
        console.error("Error fetching or processing data:", error);
      }
    };

    if (selectedLinkId) {
      fetchDataAndDrawGraph();
    }

    return () => {
      isMounted = false;
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [selectedLinkId]);

  useEffect(() => {
    console.log("Updated graphData:", graphData);
  }, [graphData]);

  useEffect(() => {
    // This effect runs when shortestPath changes
    if (shortestPath.length > 0) {
      // Select all links and update their styles
      const svg = d3.select(svgRef.current);
      svg.selectAll("line").style("stroke", (d) => {
        console.log("d.source.id: ", d.source.id, "d.target.id: ", d.target.id);
        const linkId = `${d.source.id}-${d.target.id}`;
        return shortestPath.includes(linkId) ? "red" : "#aaa";
      });
    }
  }, [shortestPath]);

  // This useEffect would run whenever the shortestPath state changes.
  useEffect(() => {
    // Select all links and update their styles based on whether they are in the shortest path
    const svg = d3.select(svgRef.current);
    svg
      .selectAll("line")
      .style("stroke", (d) => {
        // This assumes your shortestPath array contains the ids of the nodes in the path
        const linkIsInPath =
          shortestPath.includes(d.source.id) &&
          shortestPath.includes(d.target.id);
        return linkIsInPath ? "red" : "#aaa"; // Change "red" to your desired highlight color
      })
      // If needed, you can also increase the stroke-width for emphasis
      .style("stroke-width", (d) => {
        const linkIsInPath =
          shortestPath.includes(d.source.id) &&
          shortestPath.includes(d.target.id);
        return linkIsInPath ? 4 : 2; // Change 4 and 2 to your desired stroke widths
      });
  }, [shortestPath]);

  return (
    <div>
      <svg ref={svgRef}></svg>
      <div
        ref={tooltipRef}
        className="tooltip"
        style={{ position: "absolute", display: "none" }}
      >
        {/* Tooltip content will be set dynamically */}
      </div>
      {votePopup.visible && (
        <div
          ref={popupRef}
          style={{
            left: votePopup.position.x + "px",
            top: votePopup.position.y + "px",
            position: "absolute",
            transform: "translate(-100%, -100%)",
            // Add other styles as needed
          }}
        >
          <div>
            <button onClick={() => voteForEdge(votePopup.edge, "upvote")}>
              👍 <span>{voteCounts.upvote}</span>
            </button>
            <button onClick={() => voteForEdge(votePopup.edge, "downvote")}>
              👎 <span>{voteCounts.downvote}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to find the shortest path using Dijkstra's algorithm
const dijkstra = (nodes, links, startId, endId) => {
  let queue = [startId];
  let visited = new Set();
  let prev = {};

  nodes.forEach((node) => {
    prev[node.id] = null;
  });

  visited.add(startId);

  while (queue.length > 0) {
    let nodeId = queue.shift(); // dequeue the first element

    // Check if we reached the end node
    if (nodeId === endId) {
      break;
    }

    // Get all neighbors of the current node
    let neighbors = links
      .filter((link) => link.source.id === nodeId || link.target.id === nodeId)
      .map((link) =>
        link.source.id === nodeId ? link.target.id : link.source.id
      );

    // Loop through neighbors
    for (let neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        prev[neighborId] = nodeId;
        queue.push(neighborId);
      }
    }
  }

  // Reconstruct the path from endId to startId
  let path = [];
  for (let at = endId; at !== null; at = prev[at]) {
    path.push(at);
  }
  path.reverse();

  // If the startId wasn't reached, then there is no path
  if (path[0] !== startId) {
    return [];
  }

  return path;
};

// PriorityQueue class
// class PriorityQueue {
//   constructor(comparator = (a, b) => a > b) {
//     this._heap = [];
//     this._comparator = comparator;
//   }

//   size() {
//     return this._heap.length;
//   }

//   isEmpty() {
//     return this.size() === 0;
//   }

//   peek() {
//     return this._heap[0];
//   }

//   enqueue(value) {
//     this._heap.push(value);
//     this._siftUp();
//   }

//   dequeue() {
//     const poppedValue = this.peek();
//     const bottom = this.size() - 1;
//     if (bottom > 0) {
//       this._swap(0, bottom);
//     }
//     this._heap.pop();
//     this._siftDown();
//     return poppedValue;
//   }

//   _greater(i, j) {
//     return this._comparator(this._heap[i], this._heap[j]);
//   }

//   _swap(i, j) {
//     [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
//   }

//   _siftUp() {
//     let nodeIdx = this.size() - 1;
//     while (
//       nodeIdx > 0 &&
//       this._greater(Math.floor((nodeIdx - 1) / 2), nodeIdx)
//     ) {
//       this._swap(nodeIdx, Math.floor((nodeIdx - 1) / 2));
//       nodeIdx = Math.floor((nodeIdx - 1) / 2);
//     }
//   }

//   _siftDown() {
//     let nodeIdx = 0;
//     const lastIdx = this.size() - 1;
//     let leftIdx, rightIdx, greaterChildIdx;

//     while (true) {
//       leftIdx = 2 * nodeIdx + 1;
//       rightIdx = 2 * nodeIdx + 2;
//       greaterChildIdx = null;

//       if (leftIdx <= lastIdx && this._greater(nodeIdx, leftIdx)) {
//         greaterChildIdx = leftIdx;
//       }

//       if (rightIdx <= lastIdx && this._greater(nodeIdx, rightIdx)) {
//         greaterChildIdx = this._greater(greaterChildIdx, rightIdx)
//           ? greaterChildIdx
//           : rightIdx;
//       }

//       if (greaterChildIdx === null) break;
//       this._swap(nodeIdx, greaterChildIdx);
//       nodeIdx = greaterChildIdx;
//     }
//   }
// }

export default NodeGraph;
