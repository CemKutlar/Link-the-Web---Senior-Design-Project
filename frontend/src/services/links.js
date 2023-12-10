import { makeRequest } from "./makeRequests";

export function getLinks() {
  return makeRequest("/links");
}

export function getLink(id) {
  return makeRequest(`/links/${id}`);
}

// Function to check if a link exists in the database
export function checkLinkExistence(link) {
  return makeRequest(`/check-link?link=${encodeURIComponent(link)}`, {
    method: "GET",
  })
    .then((response) => {
      // Directly return the parsed response
      return response;
    })
    .catch((error) => {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
      throw error; // Rethrow the error for further handling if necessary
    });
}
