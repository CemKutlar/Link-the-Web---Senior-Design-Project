import { useState } from "react";

export function CommentForm({
  loading,
  error,
  onSubmit,
  autoFocus = false,
  initialValue = "",
}) {
  const [message, setMessage] = useState(initialValue);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(message)
      .then(() => setMessage(""))
      .catch((error) => {
        // Check if the error is due to unauthenticated user
        if (error.response && error.response.data.code === "UNAUTHENTICATED") {
          // Alert the user to log in
          alert("You must be logged in to post a comment.");
        } else {
          // Handle other types of errors (optional)
          console.error("Failed to post comment:", error);
        }
      });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="comment-form-row">
        <textarea
          autoFocus={autoFocus}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="message-input"
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Loading" : "Post"}
        </button>
      </div>
      {/* <div className="error-msg">You should be logged in to post a comment</div> */}
    </form>
  );
}
