import React, { useContext, useMemo } from "react";
import { useAsync } from "../hooks/useAsync";
import { getLink } from "../services/links";
import { useParams } from "react-router-dom";

const Context = React.createContext();

export function useLink() {
  return useContext(Context);
}

export function LinkProvider({ children }) {
  const { id } = useParams();
  const { loading, error, value: link } = useAsync(() => getLink(id), [id]);
  const commentsByParentId = useMemo(() => {
    if (link?.comments == null) return [];
    const group = {};
    link.comments.forEach((comment) => {
      const parentId = comment.parentId || null;
      group[parentId] = group[parentId] || [];
      group[parentId].push(comment);
    });
    return group;
  }, [link?.comments]);
  // console.log(link);
  console.log(commentsByParentId);

  function getReplies(parentId) {
    return commentsByParentId[parentId];
  }

  return (
    <Context.Provider
      value={{
        link: { id, ...link },
        getReplies,
        rootComments: commentsByParentId[null] || [],
      }}
    >
      {loading ? (
        <h1>Loading</h1>
      ) : error ? (
        <h1 className="error-msg">{error}</h1>
      ) : (
        children
      )}
    </Context.Provider>
  );
}
