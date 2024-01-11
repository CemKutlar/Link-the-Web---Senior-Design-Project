// npm run devStart to run the server
import fastify from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
import AWS from "aws-sdk";
import jwt from "jsonwebtoken";
import { verifyCognitoToken } from "./auth.js";
dotenv.config();

process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = "1";
import { Server } from "socket.io";
import http from "http";

const app = fastify();

const server = http.createServer(app);

app.register(sensible);

app.register(cors, {
  origin: process.env.CLIENT_URL,
  credentials: true,
});

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const cognito = new AWS.CognitoIdentityServiceProvider({
  apiVersion: "2016-04-18",
  region: process.env.AWS_REGION,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function getCognitoUserId(token) {
  const decodedToken = jwt.decode(token);
  return decodedToken ? decodedToken.sub : null;
}

function getUserInfoFromToken(token) {
  console.log("getuserinfofromtoken'a girdi");
  const decodedToken = jwt.decode(token);
  return {
    sub: decodedToken ? decodedToken.sub : null,
    name: decodedToken ? decodedToken.name : null,
  };
}

// Helper function to verify Cognito token
// async function verifyCognitoToken(token) {
//   const cognito = new AWS.CognitoIdentityServiceProvider();
//   const params = {
//     AccessToken: token,
//   };

//   return new Promise((resolve, reject) => {
//     cognito.getUser(params, (err, data) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(data);
//       }
//     });
//   });
// }

// Middleware to extract user ID from token and attach it to the request
app.addHook("preHandler", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    try {
      const decodedToken = jwt.decode(token);
      if (decodedToken && decodedToken.sub) {
        const cognitoSub = decodedToken.sub;

        // Query the database for the user's ID using cognitoSub
        const client = await pool.connect();
        try {
          const queryText = "SELECT id FROM users WHERE cognito_sub = $1";
          const dbResponse = await client.query(queryText, [cognitoSub]);
          if (dbResponse.rows.length > 0) {
            // Attach the database-generated user ID to the request object
            req.userId = dbResponse.rows[0].id;
          } else {
            throw new Error("User not found");
          }
        } finally {
          client.release();
        }
      }
    } catch (error) {
      console.error("Error in middleware:", error);
      res.send(
        app.httpErrors.internalServerError(
          "An error occurred in authentication"
        )
      );
    }
  }
});

app.post("/user/update-token", async (req, res) => {
  const { token } = req.body;
  const userInfo = getUserInfoFromToken(token);
  console.log("Line 72 = ", userInfo);
  if (!userInfo.sub) {
    return res.status(400).send({ error: "Invalid token" });
  }

  const client = await pool.connect();
  try {
    // Update an existing user or insert a new one
    const query = `
      INSERT INTO public.users (name, cognito_sub) 
      VALUES ($1, $2) 
      ON CONFLICT (cognito_sub) 
      DO UPDATE SET name = EXCLUDED.name 
      RETURNING *;
    `;
    const result = await client.query(query, [userInfo.name, userInfo.sub]);
    res.send({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).send({ error: error.message });
  } finally {
    client.release();
  }
});

const io = new Server(server, {
  cors: {
    origin: `http://localhost:3000`,
    methods: ["GET", "POST"],
  },
});
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// Define a route to fetch data from your database
app.get("/links", async (req, res) => {
  const client = await pool.connect();
  try {
    // Wrap the database query in the commitToDb function
    const result = await commitToDb(client.query("SELECT id, name FROM links"));

    // Check if there was an error
    if (result instanceof Error) {
      res.status(500).send(result.message);
    } else {
      res.send(result.rows);
    }
  } finally {
    client.release(); // Always release the client back to the pool
  }
});

// Route to check if a specific link exists
app.get("/check-link", async (req, res) => {
  const linkName = req.query.link;
  if (!linkName) {
    return res.status(400).send("Link query parameter is required");
  }

  const client = await pool.connect();
  try {
    // Updated query to fetch the id of the link
    const query = "SELECT id FROM links WHERE name = $1 LIMIT 1";
    const result = await commitToDb(client.query(query, [linkName]));
    console.log(result.rows);
    if (result instanceof Error) {
      res.status(500).send(result.message);
    } else {
      // Check if any row is returned
      if (result.rows.length > 0) {
        // Send the id of the link
        res.send({ exists: true, id: result.rows[0].id });
      } else {
        // If no link is found, return exists as false
        res.send({ exists: false });
      }
    }
  } catch (error) {
    app.log.error(error);
    res.status(500).send("Internal server error");
  } finally {
    client.release();
  }
});

app.get("/links/:id", async (request, reply) => {
  const linkId = request.params.id;
  const userId = request.userId; // Retrieved from the preHandler hook

  const client = await pool.connect();
  try {
    const query = `
      SELECT
        links.id,
        links.name,
        links.description,
        links.created_at,
        links.creator_user_id,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', comments.id,
              'message', comments.message,
              'parentId', comments.parent_id,
              'createdAt', comments.created_at,
              'user', JSON_BUILD_OBJECT(
                'id', users.id,
                'name', users.name
              ),
              'likeCount', like_data.like_count,
              'likedByMe', like_data.liked_by_me
            ) ORDER BY comments.created_at DESC
          ) FILTER (WHERE comments.id IS NOT NULL),
          '[]'
        ) AS comments
      FROM links
      LEFT JOIN comments ON links.id = comments.link_id
      LEFT JOIN users ON comments.user_id = users.id
      LEFT JOIN (
        SELECT
          comment_id,
          COUNT(*) as like_count,
          BOOL_OR(user_id = $2) as liked_by_me
        FROM likes
        GROUP BY comment_id
      ) as like_data ON like_data.comment_id = comments.id
      WHERE links.id = $1
      GROUP BY links.id;
    `;

    const result = await client.query(query, [linkId, userId]);

    if (result.rows.length > 0) {
      reply.send(result.rows[0]);
    } else {
      reply.status(404).send("Link not found");
    }
  } catch (error) {
    app.log.error(error);
    reply.status(500).send("Internal server error");
  } finally {
    client.release();
  }
});

app.post("/links/:id/comments", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .send({ error: "Authentication required", code: "UNAUTHENTICATED" });
  }

  if (!req.body.message || req.body.message.trim() === "") {
    return res.status(400).send({ error: "Message is required" });
  }

  try {
    const userData = await verifyCognitoToken(token);
    const userSub = userData.sub;

    const client = await pool.connect();
    try {
      const userQuery = "SELECT id FROM users WHERE cognito_sub = $1";
      const userResponse = await client.query(userQuery, [userSub]);

      if (userResponse.rows.length === 0) {
        throw new Error("User not found");
      }

      const userId = userResponse.rows[0].id;

      const insertCommentQuery = `
      INSERT INTO public."comments" (message, user_id, link_id, parent_id) 
      VALUES ($1, $2, $3, $4)
      RETURNING id, message, created_at, user_id, parent_id;`;

      const commentResponse = await client.query(insertCommentQuery, [
        req.body.message,
        userId,
        req.params.id,
        req.body.parentId || null,
      ]);

      const comment = commentResponse.rows[0];

      // Query to get user's name based on userId
      const userNameQuery = "SELECT name FROM users WHERE id = $1";
      const userNameResponse = await client.query(userNameQuery, [userId]);
      const userName =
        userNameResponse.rows.length > 0
          ? userNameResponse.rows[0].name
          : "Unknown User";

      // const likeCheckQuery =
      //   "SELECT 1 FROM public.likes WHERE user_id = $1 AND comment_id = $2";
      // const likeCheckResponse = await client.query(likeCheckQuery, [
      //   userId,
      //   comment.id,
      // ]);
      // const likedByMe = likeCheckResponse.rowCount > 0;

      res.send({
        ...comment,
        user: {
          id: userId,
          name: userName,
        },
        parentId: comment.parent_id,
        createdAt: comment.created_at,
        likeCount: 0, // Placeholder for like count
        likedByMe: false,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in posting comment:", error.message);
    return res.status(500).send({ error: "Internal server error" });
  }
});

app.put("/links/:linkId/comments/:commentId", async (req, res) => {
  console.log("Backend Put'a girdi");
  const { linkId, commentId } = req.params;
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).send({ error: "Message is required" });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .send({ error: "Authentication required", code: "UNAUTHENTICATED" });
  }

  try {
    const userData = await verifyCognitoToken(token);
    const userSub = userData.sub;

    const client = await pool.connect();
    try {
      const userQuery = "SELECT id FROM users WHERE cognito_sub = $1";
      const userResponse = await client.query(userQuery, [userSub]);
      if (userResponse.rows.length === 0) {
        throw new Error("User not found");
      }

      const userId = userResponse.rows[0].id;

      // Check if the comment belongs to the user
      const commentOwnerQuery = "SELECT user_id FROM comments WHERE id = $1";
      const commentOwnerResponse = await client.query(commentOwnerQuery, [
        commentId,
      ]);
      if (
        commentOwnerResponse.rows.length === 0 ||
        commentOwnerResponse.rows[0].user_id !== userId
      ) {
        return res
          .status(403)
          .send({ error: "You can only edit your own comments" });
      }

      const updateCommentQuery = `
        UPDATE public."comments"
        SET message = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING id, message, created_at, updated_at, user_id, parent_id;`;

      const updateResponse = await client.query(updateCommentQuery, [
        message,
        commentId,
        userId,
      ]);
      if (updateResponse.rows.length === 0) {
        throw new Error("Comment not found or user mismatch");
      }

      const updatedComment = updateResponse.rows[0];

      // Query to get user's name based on userId (as done in POST method)
      const userNameQuery = "SELECT name FROM users WHERE id = $1";
      const userNameResponse = await client.query(userNameQuery, [userId]);
      const userName =
        userNameResponse.rows.length > 0
          ? userNameResponse.rows[0].name
          : "Unknown User";

      res.send({
        ...updatedComment,
        user: {
          id: userId,
          name: userName,
        },
        parentId: updatedComment.parent_id,
        createdAt: updatedComment.created_at,
        updatedAt: updatedComment.updated_at,
        likeCount: 0,
        likedByMe: false,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in updating comment:", error.message);
    return res.status(500).send({ error: "Internal server error" });
  }
});

app.delete("/links/:linkId/comments/:commentId", async (req, res) => {
  const { linkId, commentId } = req.params;

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .send({ error: "Authentication required", code: "UNAUTHENTICATED" });
  }

  try {
    const userData = await verifyCognitoToken(token);
    const userSub = userData.sub;

    const client = await pool.connect();
    try {
      const userQuery = "SELECT id FROM users WHERE cognito_sub = $1";
      const userResponse = await client.query(userQuery, [userSub]);

      if (userResponse.rows.length === 0) {
        throw new Error("User not found");
      }

      const userId = userResponse.rows[0].id;

      // Check if the comment belongs to the user
      const commentOwnerQuery = "SELECT user_id FROM comments WHERE id = $1";
      const commentOwnerResponse = await client.query(commentOwnerQuery, [
        commentId,
      ]);

      if (commentOwnerResponse.rows.length === 0) {
        return res.status(404).send({ error: "Comment not found" });
      }

      if (commentOwnerResponse.rows[0].user_id !== userId) {
        return res
          .status(403)
          .send({ error: "You can only delete your own comments" });
      }

      // Delete the comment
      const deleteCommentQuery = "DELETE FROM public.comments WHERE id = $1";
      await client.query(deleteCommentQuery, [commentId]);

      res.send({ success: true, message: "Comment deleted successfully" });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in deleting comment:", error.message);
    return res.status(500).send({ error: "Internal server error" });
  }
});

app.post("/links/:linkId/comments/:commentId/toggleLike", async (req, res) => {
  const { commentId } = req.params;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .send({ error: "Authentication required", code: "UNAUTHENTICATED" });
  }

  try {
    const userData = await verifyCognitoToken(token);
    const userSub = userData.sub;

    const client = await pool.connect();
    try {
      const userQuery = "SELECT id FROM users WHERE cognito_sub = $1";
      const userResponse = await client.query(userQuery, [userSub]);

      if (userResponse.rows.length === 0) {
        throw new Error("User not found");
      }

      const userId = userResponse.rows[0].id;

      // Check if the like already exists
      const likeQuery =
        "SELECT 1 FROM likes WHERE user_id = $1 AND comment_id = $2";
      const likeResponse = await client.query(likeQuery, [userId, commentId]);

      if (likeResponse.rowCount === 0) {
        // Like does not exist, so create it
        const insertLikeQuery =
          "INSERT INTO likes (user_id, comment_id) VALUES ($1, $2)";
        await client.query(insertLikeQuery, [userId, commentId]);
        res.send({ addLike: true });
      } else {
        // Like exists, so remove it
        const deleteLikeQuery =
          "DELETE FROM likes WHERE user_id = $1 AND comment_id = $2";
        await client.query(deleteLikeQuery, [userId, commentId]);
        res.send({ addLike: false });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in toggle like:", error.message);
    return res.status(500).send({ error: "Internal server error" });
  }
});

app.post("/search-links-by-keywords", async (req, res) => {
  const { keywords } = req.body;

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .send({ error: "Authentication required", code: "UNAUTHENTICATED" });
  }

  try {
    const userData = await verifyCognitoToken(token);
    const userSub = userData.sub;

    const client = await pool.connect();
    try {
      const userQuery = "SELECT id FROM users WHERE cognito_sub = $1";
      const userResponse = await client.query(userQuery, [userSub]);
      if (userResponse.rows.length === 0) {
        throw new Error("User not found");
      }

      const query = `
        SELECT l.*, COUNT(lk.keyword) AS keyword_match_count
        FROM links l
        INNER JOIN link_keywords lk ON l.id = lk.link_id
        WHERE lk.keyword = ANY($1)
        GROUP BY l.id
        ORDER BY COUNT(lk.keyword) DESC;
      `;
      const result = await client.query(query, [keywords]);
      res.send(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error searching links by keywords:", error.message);
    return res.status(500).send({ error: "Internal server error" });
  }
});

app.post("/create-link", async (req, res) => {
  const { name, description, keywords, relatedLinks } = req.body;
  const badgeIdToAdd = "e3195c60-537d-4421-bfd6-49719831dd31"; // Badge ID to add

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .send({ error: "Authentication required", code: "UNAUTHENTICATED" });
  }

  try {
    const userData = await verifyCognitoToken(token);
    const userSub = userData.sub;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Fetch the user and their badges
      const userQuery =
        "SELECT id, badge_ids FROM users WHERE cognito_sub = $1";
      const userResponse = await client.query(userQuery, [userSub]);
      if (userResponse.rows.length === 0) {
        throw new Error("User not found");
      }

      const userId = userResponse.rows[0].id;
      const userBadges = userResponse.rows[0].badge_ids || [];

      // Check if user already has the badge
      if (!userBadges.includes(badgeIdToAdd)) {
        const updatedBadges = [...userBadges, badgeIdToAdd];
        const updateBadgesQuery = `
          UPDATE public.users
          SET badge_ids = $1
          WHERE id = $2;
        `;
        await client.query(updateBadgesQuery, [updatedBadges, userId]);
      }

      // Link creation logic
      const insertLinkQuery = `
        INSERT INTO public.links (name, description, creator_user_id)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const linkResult = await client.query(insertLinkQuery, [
        name,
        description,
        userId,
      ]);
      const newLinkId = linkResult.rows[0].id;

      for (const keyword of keywords) {
        const insertKeywordQuery = `
          INSERT INTO public.link_keywords (link_id, keyword)
          VALUES ($1, $2);
        `;
        await client.query(insertKeywordQuery, [newLinkId, keyword]);
      }

      for (const relatedLinkId of relatedLinks) {
        const insertRelatedLinkQuery = `
          INSERT INTO public.related_links (link_id, related_link_id)
          VALUES ($1, $2);
        `;
        await client.query(insertRelatedLinkQuery, [newLinkId, relatedLinkId]);
      }

      await client.query("COMMIT");
      res.send({
        success: true,
        message: "Link created successfully",
        linkId: newLinkId,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error creating new link:", error.message);
      res.status(500).send({ error: "Internal server error" });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error verifying token:", error.message);
    return res.status(500).send({ error: "Internal server error" });
  }
});

async function commitToDb(promise) {
  const [error, data] = await app.to(promise);
  if (error) return app.httpErrors.internalServerError(error.message);
  return data;
}

app.get("/related-links/:linkId", async (req, res) => {
  const linkId = req.params.linkId;

  const client = await pool.connect();
  try {
    const query = `
      WITH RECURSIVE related_links_cte AS (
        SELECT 
          rl.link_id, 
          l1.name AS link_name,
          l1.description AS link_description,
          rl.related_link_id,
          l2.name AS related_link_name,
          l2.description AS related_link_description,
          1 AS depth
        FROM 
          public.related_links rl
          JOIN public.links l1 ON rl.link_id = l1.id
          JOIN public.links l2 ON rl.related_link_id = l2.id
        WHERE 
          rl.link_id = $1 OR rl.related_link_id = $1

        UNION ALL

        SELECT 
          rl.link_id,
          l1.name,
          l1.description,
          rl.related_link_id,
          l2.name,
          l2.description,
          cte.depth + 1
        FROM 
          public.related_links rl
          JOIN public.links l1 ON rl.link_id = l1.id
          JOIN public.links l2 ON rl.related_link_id = l2.id
          INNER JOIN related_links_cte cte ON rl.link_id = cte.related_link_id OR rl.related_link_id = cte.link_id
        WHERE 
          cte.depth < 5
      )
      SELECT * FROM related_links_cte;
    `;

    const result = await client.query(query, [linkId]);
    res.send(result.rows);
  } catch (error) {
    console.error("Error fetching related links:", error);
    res.status(500).send({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// Endpoint to handle edge votes
app.post("/vote-edge", async (req, res) => {
  console.log("vote-edge girdi !!!!!");
  console.log(req.body);
  const { link_id, related_link_id, vote_type } = req.body;
  const userId = req.userId; // Assuming you have user authentication set up
  console.log("link_id in vote-edge: ", link_id);
  if (!userId) {
    return res.status(401).send({ error: "Authentication required" });
  }

  const client = await pool.connect();
  try {
    // Begin a transaction
    await client.query("BEGIN");

    // Check if the user has already voted on this edge
    const voteCheckQuery = `
      SELECT vote_id FROM edge_votes
      WHERE link_id = $1 AND related_link_id = $2 AND user_id = $3;
    `;
    const voteCheckResult = await client.query(voteCheckQuery, [
      link_id,
      related_link_id,
      userId,
    ]);

    // If the user has voted, update the vote; otherwise, insert a new vote
    if (voteCheckResult.rows.length > 0) {
      const updateVoteQuery = `
        UPDATE edge_votes
        SET vote_type = $1, created_at = NOW()
        WHERE vote_id = $2;
      `;
      await client.query(updateVoteQuery, [
        vote_type,
        voteCheckResult.rows[0].vote_id,
      ]);
    } else {
      const insertVoteQuery = `
        INSERT INTO edge_votes (link_id, related_link_id, user_id, vote_type)
        VALUES ($1, $2, $3, $4);
      `;
      await client.query(insertVoteQuery, [
        link_id,
        related_link_id,
        userId,
        vote_type,
      ]);
    }

    // Commit the transaction
    await client.query("COMMIT");

    res.send({ success: true, message: "Vote recorded" });
  } catch (error) {
    // Rollback the transaction in case of an error
    await client.query("ROLLBACK");
    console.error("Error recording vote:", error);
    res.status(500).send({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// Endpoint to get all connections for a given link
app.get("/related-links-hover/:linkId", async (req, res) => {
  console.log("girdiiiiiii");
  const linkId = req.params.linkId;

  const client = await pool.connect();
  try {
    // Query to get the description of the hovered link and related link IDs
    const query = `
      SELECT l.id, l.description, 
      CASE WHEN l.id = $1 THEN 'hovered' ELSE 'related' END as link_type
      FROM links l
      WHERE l.id = $1 OR l.id IN (
        SELECT related_link_id FROM related_links WHERE link_id = $1
        UNION
        SELECT link_id FROM related_links WHERE related_link_id = $1
      );
    `;

    const result = await client.query(query, [linkId]);
    res.send(result.rows);
  } catch (error) {
    console.error("Error fetching related links:", error);
    res.status(500).send({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

app.get("/edge-vote-counts", async (req, res) => {
  console.log("edge-cote-count q girdi");
  const { linkId, relatedLinkId } = req.query;

  if (!linkId || !relatedLinkId) {
    return res
      .status(400)
      .send({ error: "Link ID and related link ID are required" });
  }

  const client = await pool.connect();
  try {
    const voteCountQuery = `
          SELECT 
              vote_type, 
              COUNT(*) as count 
          FROM edge_votes 
          WHERE link_id = $1 AND related_link_id = $2 
          GROUP BY vote_type;
      `;

    const result = await client.query(voteCountQuery, [linkId, relatedLinkId]);
    const voteCounts = result.rows.reduce(
      (acc, row) => {
        acc[row.vote_type] = parseInt(row.count, 10);
        return acc;
      },
      { upvote: 0, downvote: 0 }
    );

    console.log(voteCounts);
    res.send(voteCounts);
  } catch (error) {
    console.error("Error fetching vote counts:", error);
    res.status(500).send({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

app.get("/get-user-badges", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .send({ error: "Authentication required", code: "UNAUTHENTICATED" });
  }

  try {
    await verifyCognitoToken(token);

    const userId = req.query.userId; // Use the user ID passed from the frontend
    if (!userId) {
      return res.status(400).send({ error: "User ID is required" });
    }

    const client = await pool.connect();
    try {
      // Fetch the badge IDs for the given user ID
      const userQuery = "SELECT badge_ids FROM users WHERE id = $1";
      const userResponse = await client.query(userQuery, [userId]);
      if (userResponse.rows.length === 0) {
        throw new Error("User not found");
      }

      const badgeIds = userResponse.rows[0].badge_ids;

      // Check if user has any badges
      if (!badgeIds || badgeIds.length === 0) {
        res.send({ badges: [] });
      } else {
        // Fetch badge details
        const badgeQuery =
          "SELECT id, badge_name FROM badges WHERE id = ANY($1::uuid[])";
        const badgesResponse = await client.query(badgeQuery, [badgeIds]);
        res.send({ badges: badgesResponse.rows });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching user badges:", error.message);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.get("/get-current-user", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({ error: "Authentication required" });
  }

  try {
    const decodedToken = jwt.decode(token);
    if (!decodedToken || !decodedToken.sub) {
      return res.status(401).send({ error: "Invalid token" });
    }

    const cognitoSub = decodedToken.sub;
    const client = await pool.connect();
    try {
      const queryText =
        "SELECT id, name, cognito_sub FROM users WHERE cognito_sub = $1";
      const dbResponse = await client.query(queryText, [cognitoSub]);

      if (dbResponse.rows.length > 0) {
        const user = dbResponse.rows[0];
        res.send({
          userId: user.id,
          name: user.name,
          cognitoSub: user.cognito_sub,
        });
      } else {
        res.status(404).send({ error: "User not found" });
      }
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).send({ error: "Internal server error" });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Token decoding error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});
// Health check endpoint
app.get("/backend/health", (req, res) => {
  console.log("Health check happening!");
  res.status(200).send("OK");
});

app.get("/cem", (req, res) => {
  console.log("Health check happening!");
  res.send({ name: "GeeksforGeeks" });
});

app.listen({ port: process.env.PORT, host: "0.0.0.0" }, (err) => {
  console.log("PORT in server:", process.env.PORT);
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
server.listen(3001, () => {
  console.log("PORT in server 2:", process.env.PORT);
  console.log("SERVER RUNNING");
});

// change trigger for github: 3
