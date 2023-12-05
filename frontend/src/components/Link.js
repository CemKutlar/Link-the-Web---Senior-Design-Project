import { useParams } from "react-router-dom";

export function Linkk() {
  const { id } = useParams();
  console.log("Link ID:", id);
  return <div>Hi, the link ID is {id}</div>;
}
