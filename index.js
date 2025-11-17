const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

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
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    const db = client.db('hellodigital');
    freelanceCollection = db.collection("freelance");
    acceptedTasksCollection = db.collection("acceptedTasks");
    applicationsCollection = db.collection("applications");
    await client.db("admin").command({ ping: 1 });
    dbConnected = true;
    console.log(" Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error(' Failed to connect to MongoDB:', error.message);
    console.log('Server will continue running. Retrying connection in 10 seconds...');
    dbConnected = false;
    setTimeout(connectDB, 10000);
  }
}

// Root route
app.get('/', (req, res) => {
  res.send('Job-Khuiji is running');
});

app.post('/freelance', async (req, res) => {
  console.log('POST /freelance hit!');
  try {
    if (!dbConnected) {
      console.log('DB not connected, returning 503');
      return res.status(503).send({ error: 'Database not connected' });
    }
    const newJob = req.body;
    console.log('Received job data:', newJob);
    const result = await freelanceCollection.insertOne(newJob);
    console.log('Insert result:', result);
    res.send(result);
  } catch (error) {
    console.error('Error adding job:', error);
    res.status(500).send({ error: 'Failed to add job', details: error.message });
  }
});

console.log('Routes registered!');

app.get('/freelance', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(503).send({ error: 'Database not connected' });
    }
    const cursor = freelanceCollection.find();
    const result = await cursor.toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).send({ error: 'Failed to fetch jobs', details: error.message });
  }
});

app.get('/freelance/job/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await freelanceCollection.findOne(query);
    res.send(result);
  } catch (error) {
    console.error('Error fetching job by id:', error);
    res.status(500).send({ error: 'Failed to fetch job', details: error.message });
      }
    });

app.get('/freelance/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const query = { userEmail: email };
    const result = await freelanceCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching jobs by email:', error);
    res.status(500).send({ error: 'Failed to fetch jobs', details: error.message });
      }
    });

app.patch('/freelance/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedJob = req.body;
    const query = { _id: new ObjectId(id) };
    const update = {
      $set: {
        title: updatedJob.title,
        postedBy: updatedJob.postedBy,
        category: updatedJob.category,
        summary: updatedJob.summary,
        coverImage: updatedJob.coverImage,
        userEmail: updatedJob.userEmail,
      },
    };
    const result = await freelanceCollection.updateOne(query, update);
    res.send(result);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).send({ error: 'Failed to update job', details: error.message });
      }
    });

app.put('/freelance/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedJob = req.body;
    const query = { _id: new ObjectId(id) };
    const update = {
      $set: {
        title: updatedJob.title,
        postedBy: updatedJob.postedBy,
        category: updatedJob.category,
        summary: updatedJob.summary,
        coverImage: updatedJob.coverImage,
        userEmail: updatedJob.userEmail,
      },
    };
    const result = await freelanceCollection.updateOne(query, update);
    res.send(result);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).send({ error: 'Failed to update job', details: error.message });
      }
    });

app.delete('/freelance/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await freelanceCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).send({ error: 'Failed to delete job', details: error.message });
      }
    });

    
app.post('/acceptedTasks', async (req, res) => {
  try {
    const newTask = req.body;
    const result = await acceptedTasksCollection.insertOne(newTask);
    res.send(result);
  } catch (error) {
    console.error('Error adding accepted task:', error);
    res.status(500).send({ error: 'Failed to add task', details: error.message });
      }
    });

    app.post('/applications', async (req, res) => {
      try {
        if (!dbConnected) return res.status(503).send({ error: 'Database not connected' });
        const appDoc = req.body;
        if (!appDoc.jobId || !appDoc.applicantEmail) {
          return res.status(400).send({ error: 'jobId and applicantEmail are required' });
        }
        appDoc.status = appDoc.status || 'pending';
        const result = await applicationsCollection.insertOne(appDoc);
        res.send(result);
      } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).send({ error: 'Failed to submit application', details: error.message });
      }
    });

    app.get('/applications', async (req, res) => {
      try {
        if (!dbConnected) return res.status(503).send({ error: 'Database not connected' });
        const { jobId, applicantEmail, posterEmail } = req.query;
        
        if (posterEmail) {
          const userJobs = await freelanceCollection.find({ userEmail: posterEmail }).toArray();
          const jobIds = userJobs.map(job => job._id.toString());
          const applications = await applicationsCollection.find({ 
            jobId: { $in: jobIds } 
          }).toArray();
          return res.send(applications);
        }
        
        const query = {};
        if (jobId) query.jobId = jobId;
        if (applicantEmail) query.applicantEmail = applicantEmail;
        const result = await applicationsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).send({ error: 'Failed to fetch applications', details: error.message });
      }
    });

    app.patch('/applications/:id', async (req, res) => {
      try {
        if (!dbConnected) return res.status(503).send({ error: 'Database not connected' });
        const id = req.params.id;
        const { action, approverEmail } = req.body; 
        if (!action) return res.status(400).send({ error: 'action is required' });

        const appDoc = await applicationsCollection.findOne({ _id: new ObjectId(id) });
        if (!appDoc) return res.status(404).send({ error: 'Application not found' });

        const job = await freelanceCollection.findOne({ _id: new ObjectId(appDoc.jobId) });
        if (!job) return res.status(404).send({ error: 'Job not found' });

        if (!approverEmail || approverEmail !== job.userEmail) {
          return res.status(403).send({ error: 'Only the job poster can approve or reject applications' });
        }

        if (action === 'approve') {
          const acceptedTask = {
            jobId: appDoc.jobId,
            title: job.title,
            category: job.category,
            summary: job.summary,
            coverImage: job.coverImage,
            postedBy: job.postedBy,
            userEmail: appDoc.applicantEmail,
            acceptedBy: approverEmail,
            acceptedAt: new Date().toISOString(),
          };
          await acceptedTasksCollection.insertOne(acceptedTask);
          const update = { $set: { status: 'approved', approvedAt: new Date().toISOString(), approvedBy: approverEmail } };
          const result = await applicationsCollection.updateOne({ _id: new ObjectId(id) }, update);
          return res.send({ result, acceptedTask });
        }

        if (action === 'reject') {
          const update = { $set: { status: 'rejected', rejectedAt: new Date().toISOString(), rejectedBy: approverEmail } };
          const result = await applicationsCollection.updateOne({ _id: new ObjectId(id) }, update);
          return res.send({ result });
        }

        res.status(400).send({ error: 'Unknown action' });
      } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).send({ error: 'Failed to update application', details: error.message });
      }
    });

    app.delete('/applications/:id', async (req, res) => {
      try {
        if (!dbConnected) return res.status(503).send({ error: 'Database not connected' });
        const id = req.params.id;
        const result = await applicationsCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).send({ error: 'Failed to delete application', details: error.message });
      }
    });

app.get('/acceptedTasks', async (req, res) => {
  try {
    const userEmail = req.query.userEmail;
    if (!userEmail) return res.status(400).send({ error: "userEmail query param is required" });
    const query = { userEmail };
    const result = await acceptedTasksCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching accepted tasks:', error);
    res.status(500).send({ error: 'Failed to fetch tasks', details: error.message });
      }
    });

app.delete('/acceptedTasks/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await acceptedTasksCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    console.error('Error deleting accepted task:', error);
    res.status(500).send({ error: 'Failed to delete task', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Job-Khuiji backend running on port ${port}`);
  connectDB();
});




