import { Comment } from "./Comment";

export function CommentList({ comments }) {
  // console.log("Comments:", comments);

  return comments.map((comment) => (
    <div key={comment.id} className="comment-stack">
      <Comment {...comment} />
    </div>
  ));
}
