
import express from 'express';
import cors from 'cors';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

const app = express();

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://thehellodigital:TestTEst@hellodigital.nnevhra.mongodb.net/?appName=hellodigital";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let freelanceCollection;
let acceptedTasksCollection;
let applicationsCollection;
let dbConnected = false;

async function connectDB() {
  try {
    if (dbConnected) return;

    await client.connect();
    const db = client.db('hellodigital');

    freelanceCollection = db.collection("freelance");
    acceptedTasksCollection = db.collection("acceptedTasks");
    applicationsCollection = db.collection("applications");

    await client.db("admin").command({ ping: 1 });

    dbConnected = true;
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
  }
}

connectDB();


app.get("/", (req, res) => {
  res.send("Job-Khuiji is running");
});

app.post("/freelance", async (req, res) => {
  try {
    if (!dbConnected) return res.status(503).send({ error: "DB not connected" });
    const result = await freelanceCollection.insertOne(req.body);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to add job", details: error.message });
  }
});

app.get("/freelance", async (req, res) => {
  try {
    const result = await freelanceCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch jobs", details: error.message });
  }
});

app.get("/freelance/job/:id", async (req, res) => {
  try {
    const job = await freelanceCollection.findOne({ _id: new ObjectId(req.params.id) });
    res.send(job);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch job" });
  }
});

app.get("/freelance/:email", async (req, res) => {
  try {
    const result = await freelanceCollection.find({ userEmail: req.params.email }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch jobs" });
  }
});

app.patch("/freelance/:id", async (req, res) => {
  try {
    const result = await freelanceCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to update job" });
  }
});

app.put("/freelance/:id", async (req, res) => {
  try {
    const result = await freelanceCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to update job" });
  }
});

app.delete("/freelance/:id", async (req, res) => {
  try {
    const result = await freelanceCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to delete job" });
  }
});


app.post("/applications", async (req, res) => {
  try {
    const data = req.body;
    if (!data.jobId || !data.applicantEmail) {
      return res.status(400).send({ error: "jobId & applicantEmail required" });
    }

    data.status = "pending";

    const result = await applicationsCollection.insertOne(data);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to submit application" });
  }
});

app.get("/applications", async (req, res) => {
  try {
    const { jobId, applicantEmail, posterEmail } = req.query;

  
    if (posterEmail) {
      const jobs = await freelanceCollection.find({ userEmail: posterEmail }).toArray();
      const jobIds = jobs.map(j => j._id.toString());
      const apps = await applicationsCollection.find({ jobId: { $in: jobIds } }).toArray();
      return res.send(apps);
    }

  
    const query = {};
    if (jobId) query.jobId = jobId;
    if (applicantEmail) query.applicantEmail = applicantEmail;

    const result = await applicationsCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch applications" });
  }
});

app.patch("/applications/:id", async (req, res) => {
  try {
    const { action, approverEmail } = req.body;

    const appDoc = await applicationsCollection.findOne({ _id: new ObjectId(req.params.id) });
    const job = await freelanceCollection.findOne({ _id: new ObjectId(appDoc.jobId) });

    if (approverEmail !== job.userEmail) {
      return res.status(403).send({ error: "Not authorized" });
    }

    if (action === "approve") {
      await acceptedTasksCollection.insertOne({
        jobId: appDoc.jobId,
        title: job.title,
        category: job.category,
        summary: job.summary,
        coverImage: job.coverImage,
        postedBy: job.postedBy,
        userEmail: appDoc.applicantEmail,
        acceptedBy: approverEmail,
        acceptedAt: new Date(),
      });

      const result = await applicationsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status: "approved" } }
      );

      return res.send(result);
    }

    if (action === "reject") {
      const result = await applicationsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status: "rejected" } }
      );

      return res.send(result);
    }

    res.status(400).send({ error: "Invalid action" });

  } catch (error) {
    res.status(500).send({ error: "Failed to update application" });
  }
});

app.delete("/applications/:id", async (req, res) => {
  try {
    const result = await applicationsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to delete application" });
  }
});


app.get("/acceptedTasks", async (req, res) => {
  try {
    const result = await acceptedTasksCollection.find({ userEmail: req.query.userEmail }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch tasks" });
  }
});

app.delete("/acceptedTasks/:id", async (req, res) => {
  try {
    const result = await acceptedTasksCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to delete task" });
  }
});


export default app;
