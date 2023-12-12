import { useLink } from "../contexts/LinkContext";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";
import { useAsyncFn } from "../hooks/useAsync";
import { createComment } from "../services/comments";

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
  const {
    loading,
    error,
    execute: createCommentFn,
  } = useAsyncFn(createComment);

  function onCommentCreate(message) {
    return createCommentFn({ linkId: link.id, message }).then(
      createLocalComment
    );
  }

  //console.log("In Linkk", link);
  return (
    <>
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
