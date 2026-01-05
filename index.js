import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dmz9jzdtm",
  api_key: process.env.CLOUDINARY_API_KEY || "341419547174899",
  api_secret: process.env.CLOUDINARY_API_SECRET || "j3Hh1VJzhwp3O6ReU9cZxDpK5Es",
  secure: true,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// MongoDB connection URI (use env, fallback to provided connection string)
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://thehellodigital:Arafat111@hellodigital.nnevhra.mongodb.net/?appName=hellodigital";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function getDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB");
  }

  const db = client.db("hellodigital");

  return {
    freelance: db.collection("freelance"),
    acceptedTasks: db.collection("acceptedTasks"),
    applications: db.collection("applications"),
  };
}

app.get("/", (req, res) => {
  res.send("Job-Khuiji is running");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: "No file provided" });
  }

  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "job-khuji", resource_type: "image" },
          (error, uploaded) => {
            if (error) return reject(error);
            return resolve(uploaded);
          }
        )
        .end(req.file.buffer);
    });

    return res.send({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload failed", error);
    return res
      .status(500)
      .send({ error: "Failed to upload image", details: error.message });
  }
});

app.post("/freelance", async (req, res) => {
  try {
    const { freelance } = await getDB();
    const result = await freelance.insertOne(req.body);

    res.send(result);
  } catch (error) {
    res
      .status(500)
      .send({ error: "Failed to add job", details: error.message });
  }
});

app.get("/freelance", async (req, res) => {
  try {
    const { freelance } = await getDB();
    const result = await freelance.find().toArray();
    res.send(result);
  } catch (error) {
    res
      .status(500)
      .send({ error: "Failed to fetch jobs", details: error.message });
  }
});



app.get("/latest", async (req, res) => {
  try {
    const { freelance } = await getDB();
    const result = await freelance.find().sort({ _id: -1 }).toArray(); // latest first
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch jobs", details: error.message });
  }
});





app.get("/freelance/job/:id", async (req, res) => {
  try {
    const { freelance } = await getDB();
    const job = await freelance.findOne({ _id: new ObjectId(req.params.id) });
    res.send(job);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch job" });
  }
});

app.get("/freelance/:email", async (req, res) => {
  try {
    const { freelance } = await getDB();
    const result = await freelance
      .find({ userEmail: req.params.email })
      .toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch jobs" });
  }
});

app.patch("/freelance/:id", async (req, res) => {
  try {
    const { freelance } = await getDB();
    const result = await freelance.updateOne(
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
    const { freelance } = await getDB();
    const result = await freelance.updateOne(
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
    const { freelance } = await getDB();
    const result = await freelance.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to delete job" });
  }
});

app.post("/applications", async (req, res) => {
  try {
    const data = req.body;

    if (!data.jobId || !data.applicantEmail)
      return res.status(400).send({ error: "jobId & applicantEmail required" });

    const { applications } = await getDB();
    data.status = "pending";

    const result = await applications.insertOne(data);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to submit application" });
  }
});

app.get("/applications", async (req, res) => {
  try {
    const { freelance, applications } = await getDB();
    const { jobId, applicantEmail, posterEmail } = req.query;

    if (posterEmail) {
      const jobs = await freelance.find({ userEmail: posterEmail }).toArray();
      const jobIds = jobs.map((j) => j._id.toString());
      const apps = await applications
        .find({ jobId: { $in: jobIds } })
        .toArray();
      return res.send(apps);
    }

    const query = {};
    if (jobId) query.jobId = jobId;
    if (applicantEmail) query.applicantEmail = applicantEmail;

    const result = await applications.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch applications" });
  }
});

app.patch("/applications/:id", async (req, res) => {
  try {
    const { action, approverEmail } = req.body;

    const { freelance, applications, acceptedTasks } = await getDB();

    const appDoc = await applications.findOne({
      _id: new ObjectId(req.params.id),
    });
    const job = await freelance.findOne({ _id: new ObjectId(appDoc.jobId) });

    if (approverEmail !== job.userEmail)
      return res.status(403).send({ error: "Not authorized" });

    if (action === "approve") {
      await acceptedTasks.insertOne({
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

      const result = await applications.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status: "approved" } }
      );
      return res.send(result);
    }

    if (action === "reject") {
      const result = await applications.updateOne(
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
    const { applications } = await getDB();
    const result = await applications.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to delete application" });
  }
});

app.get("/acceptedTasks", async (req, res) => {
  try {
    const { acceptedTasks } = await getDB();
    const result = await acceptedTasks
      .find({ userEmail: req.query.userEmail })
      .toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch tasks" });
  }
});

app.delete("/acceptedTasks/:id", async (req, res) => {
  try {
    const { acceptedTasks } = await getDB();
    const result = await acceptedTasks.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to delete task" });
  }
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;



