import * as React from "react";
//import { SearchField } from "@aws-amplify/ui-react";
import styles from "./styles/LinkPage.css";
import { useState, useEffect } from "react";
import "@aws-amplify/ui-react/styles.css";
import { LinkList } from "./components/LinkList";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import Chat from "./Chat";

const LinkPage = () => {
  const { linkName } = useParams();
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const socket = io.connect(process.env.REACT_APP_SERVER_URL);
    socket.emit("join_room", linkName);
    setShowChat(true);
    return () => {
      socket.disconnect();
    };
  }, [linkName]);

  return (
    <div className={styles.container}>
      <h1>Link Details</h1>
      <p>Link Name: {decodeURIComponent(linkName)}</p>
      {/* Additional details and functionality for the link */}
      <LinkList />
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
      {showChat && (
        <Chat socket={io.connect(process.env.REACT_APP_SERVER_URL)} />
      )}
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
