import React from "react";
import { useAsync } from "../hooks/useAsync";
import { getLink } from "../services/links";
import { useParams } from "react-router-dom";

const Context = React.createContext();

export function LinkProvider({ children }) {
  const { id } = useParams();
  console.log(id);
  const { loading, error, value: link } = useAsync(() => getLink(id), [id]);

  if (loading) {
    return <div>Loading...</div>; // Or any loading indicator
  }

  if (error) {
    console.error("Error in LinkProvider:", error);
    return <div>Error: {error.message}</div>; // Display error message
  }

  console.log(link); // Now, link should not be undefined if there's no error and loading is done

  return <Context.Provider value={{ link }}>{children}</Context.Provider>;
}
