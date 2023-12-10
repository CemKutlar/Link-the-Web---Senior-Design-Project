import { useLink } from "../contexts/LinkContext";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";
import { useAsyncFn } from "../hooks/useAsync";
import { createComment } from "../services/comments";

export function Linkk() {
  const { link, rootComments } = useLink();
  const {
    loading,
    error,
    execute: createCommentFn,
  } = useAsyncFn(createComment);

  function onCommentCreate(message) {
    return createCommentFn({ linkId: link.id, message }).then((comment) => {
      // createLocalComment
      console.log(comment);
    });
  }
  console.log("In Linkk", link);
  return (
    <>
      <h1>{link.name}</h1>
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
