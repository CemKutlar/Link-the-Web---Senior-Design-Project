import { makeAuthRequest } from "./makeRequests";

export function createComment({ linkId, message, parentId }) {
  return makeAuthRequest(`links/${linkId}/comments`, {
    method: "POST",
    data: { message, parentId },
  });
}

export function updateComment({ linkId, message, id }) {
  return makeAuthRequest(`links/${linkId}/comments/${id}`, {
    method: "PUT",
    data: { message },
  });
}

export function deleteComment({ linkId, id }) {
  return makeAuthRequest(`links/${linkId}/comments/${id}`, {
    method: "DELETE",
  });
}

export function toggleCommentLike({ id, linkId }) {
  return makeAuthRequest(`links/${linkId}/comments/${id}/toggleLike`, {
    method: "POST",
  });
}
