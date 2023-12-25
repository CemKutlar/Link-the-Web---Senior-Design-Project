import { useLink } from "../contexts/LinkContext";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";
import { useAsyncFn } from "../hooks/useAsync";
import { createComment } from "../services/comments";
import { useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";

// Custom hook to get linkName
export function useLinkName() {
  const context = useLink();
  if (!context || !context.link) {
    return null; // or some default value
  }
  return context.link.name;
}

export function Linkk() {
  const linkName = useLinkName(); // Use the custom hook
  const { link, rootComments, createLocalComment } = useLink();
  console.log("dsfhşsabfjnweubvıuğaebv", link.id);
  const {
    loading,
    error,
    execute: createCommentFn,
  } = useAsyncFn(createComment);

  const navigate = useNavigate();

  const navigateToNodeGraph = async () => {
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      console.log("token in link page", token);
      navigate("/nodepage", { state: { linkId: link.id, token: token } });
    } catch (error) {
      console.error("Error getting user token", error);
      // Handle error, perhaps redirect to login
      navigate("/");
    }
  };

  function onCommentCreate(message) {
    return createCommentFn({ linkId: link.id, message }).then(
      createLocalComment
    );
  }

  //console.log("In Linkk", link);
  return (
    <>
      <button onClick={navigateToNodeGraph}>View Node Graph</button>
      <h1>{linkName}</h1>
      <article>{link.description}</article>
      <h3 className="comments-tittle">Comments</h3>
      <section>
        <CommentForm
          loading={loading}
          error={error}
          onSubmit={onCommentCreate}
        />
        {rootComments != null && rootComments.length > 0 && (
          <div className="mt-4">
            <CommentList comments={rootComments} />
          </div>
        )}
      </section>
    </>
  );
}
