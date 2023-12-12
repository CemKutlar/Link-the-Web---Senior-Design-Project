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
              )
            ) ORDER BY comments.created_at DESC
          ) FILTER (WHERE comments.id IS NOT NULL),
          '[]'
        ) AS comments
      FROM public.links
      LEFT JOIN public.comments ON links.id = comments.link_id
      LEFT JOIN public.users ON comments.user_id = users.id
      WHERE links.id = $1
      GROUP BY links.id;
    `;

    const result = await client.query(query, [linkId]);

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

      const likeCheckQuery =
        "SELECT 1 FROM public.likes WHERE user_id = $1 AND comment_id = $2";
      const likeCheckResponse = await client.query(likeCheckQuery, [
        userId,
        comment.id,
      ]);
      const likedByMe = likeCheckResponse.rowCount > 0;

      res.send({
        ...comment,
        user: {
          id: userId,
          name: userName,
        },
        parentId: comment.parent_id,
        createdAt: comment.created_at,
        likeCount: 0, // Placeholder for like count
        likedByMe: likedByMe,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in posting comment:", error.message);
    return res.status(500).send({ error: "Internal server error" });
  }
});

async function commitToDb(promise) {
  const [error, data] = await app.to(promise);
  if (error) return app.httpErrors.internalServerError(error.message);
  return data;
}

app.listen({ port: process.env.PORT }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
server.listen(3001, () => {
  console.log("SERVER RUNNING");
});
