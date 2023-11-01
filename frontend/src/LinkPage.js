import * as React from "react";
import { SearchField } from "@aws-amplify/ui-react";
import styles from "./styles/LinkPage.module.css"; // Import the CSS module
import { useState } from "react";
import "@aws-amplify/ui-react/styles.css";

const LinkPage = () => {
  return (
    <div className={styles.container}>
      <SearchField
        className={styles.searchField}
        label="Search"
        placeholder="Search here..."
        labelHidden={false}
      />
      <div className="comment-section">
        <h2>Comments</h2>
        <div className="new-comment">
          <textarea placeholder="Add a comment..."></textarea>
          <button>Post Comment</button>
        </div>
        {dummyComments.map((comment) => (
          <Comment key={comment.id} data={comment} />
        ))}
      </div>
    </div>
  );
};

const dummyComments = [
  {
    id: 1,
    text: "This is a comment",
    votes: 10,
    replies: [
      { id: 1, text: "This is a reply to the comment", votes: 5 },
      { id: 2, text: "Another reply to the comment", votes: 2 },
    ],
  },
  {
    id: 2,
    text: "Another top-level comment",
    votes: 8,
    replies: [],
  },
];

const Comment = ({ data }) => {
  const [votes, setVotes] = useState(data.votes);

  return (
    <div className="comment">
      <p>{data.text}</p>
      <div className="votes">
        <button onClick={() => setVotes(votes + 1)}>Upvote</button>
        <span>{votes}</span>
        <button onClick={() => setVotes(votes - 1)}>Downvote</button>
      </div>
      <div className="replies">
        {data.replies.map((reply) => (
          <Reply key={reply.id} data={reply} />
        ))}
      </div>
    </div>
  );
};

const Reply = ({ data }) => {
  const [votes, setVotes] = useState(data.votes);

  return (
    <div className="reply">
      <p>{data.text}</p>
      <div className="votes">
        <button onClick={() => setVotes(votes + 1)}>Upvote</button>
        <span>{votes}</span>
        <button onClick={() => setVotes(votes - 1)}>Downvote</button>
      </div>
    </div>
  );
};
export default LinkPage;
