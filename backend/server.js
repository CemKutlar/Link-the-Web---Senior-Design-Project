// npm run devStart to run the server
import fastify from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
dotenv.config();

const app = fastify();
app.register(sensible);
app.register(cors, {
  origin: process.env.CLIENT_URL,
  credentials: true,
});
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
  // const userId = request.cookies.userId; // Adjust according to your cookie setup

  const client = await pool.connect();
  try {
    const query = `
      WITH link_details AS (
          SELECT l.id, l.name, l.description, l.created_at, l.creator_user_id
          FROM public.links l
          WHERE l.id = $1
      ),
      comments_details AS (
          SELECT c.id, c.message, c.created_at, c.updated_at, c.user_id, c.link_id, c.parent_id, COUNT(l.user_id) AS like_count
          FROM public.comments c
          LEFT JOIN public.likes l ON c.id = l.comment_id
          WHERE c.link_id = $1
          GROUP BY c.id
          ORDER BY c.created_at DESC
      ),
      user_likes AS (
          SELECT comment_id
          FROM public.likes
          WHERE user_id = $2
          AND comment_id IN (SELECT id FROM comments_details)
      )
      SELECT ld.*, cd.*, ul.comment_id IS NOT NULL AS liked_by_me
      FROM link_details ld
      CROSS JOIN comments_details cd
      LEFT JOIN user_likes ul ON cd.id = ul.comment_id;
    `;

    const result = await commitToDb(client.query(query, [linkId])); //const result = await commitToDb(client.query(query, [linkId, userId]));

    if (result instanceof Error) {
      reply.status(500).send(result.message);
    } else {
      reply.send(result.rows);
    }
  } catch (error) {
    app.log.error(error);
    reply.status(500).send("Internal server error");
  } finally {
    client.release();
  }
});

async function commitToDb(promise) {
  const [error, data] = await app.to(promise);
  if (error) return app.httpErrors.internalServerError(error.message);
  return data;
}

app.listen({ port: process.env.PORT });
