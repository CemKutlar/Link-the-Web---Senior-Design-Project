import { makeRequest } from "./makeRequests";

export function createComment({ linkId, message, parentId }) {
  return makeRequest(`links/${linkId}/comments`, {
    method: "POST",
    data: { message, parentId },
  });
}

export function updateComment({ linkId, message, id }) {
  return makeRequest(`posts/${linkId}/comments/${id}`, {
    method: "PUT",
    data: { message },
  });
}

export function deleteComment({ linkId, id }) {
  return makeRequest(`posts/${linkId}/comments/${id}`, {
    method: "DELETE",
  });
}

export function toggleCommentLike({ id, linkId }) {
  return makeRequest(`/links/${linkId}/comments/${id}/toggleLike`, {
    method: "POST",
  });
}
