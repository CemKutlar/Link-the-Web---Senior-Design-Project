import { Link } from "react-router-dom";
import { useAsync } from "../hooks/useAsync";
import { getLinks } from "../services/links";
export function LinkList() {
  const { loading, error, value: links } = useAsync(getLinks);

  if (loading) return <h1>Loading</h1>;
  if (error) return <h1 className="error-msg">{error}</h1>;

  return links.map((link) => {
    return (
      <h1 key={link.id}>
        <Link to={`/links/${link.id}`}>{link.name}</Link>
      </h1>
    );
  });
}
