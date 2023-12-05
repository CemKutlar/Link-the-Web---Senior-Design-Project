import React from "react";
import { useAsync } from "../hooks/useAsync";
import { getLink } from "../services/links";
import { useParams } from "react-router-dom";

const Context = React.createContext();

export function LinkProvider({ children }) {
  const { id } = useParams();
  const { loading, error, value: link } = useAsync(() => getLink(id), [id]);
  console.log(link);
  return <Context.Provider value={{}}>{children}</Context.Provider>;
}
