const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); 


const verificationCodes = {};

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const upload = multer({ storage });

// MongoDB setup
const uri = "mongodb+srv://learntrackdb:DzCmjn3uUe6U9Wz9@cluster0.lfqezux.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);
const dbName = "learntrackdb";

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "LearnTrackDB@gmail.com",
        pass: "imtm rwds bbxl lraa",
    },
});

// --- SIGN UP ---
app.post('/signup', async (req, res) => {
    const { FULLNAME, USERNAME, PASSWORD, EMAIL, ROLE } = req.body;

    try {
        const collection = ROLE === "Student" ? "LT_Students" : "LT_Teachers";

        const database = client.db(dbName);
        const accounts = database.collection(collection);

        // Check if username already exists
        const existingUser = await accounts.findOne({ USERNAME: USERNAME });

        if (existingUser) {
            return res.status(409).send('Username already exists. Please choose a different one.');
        }

        // Proceed to insert new user
        await accounts.insertOne({
            FULL_NAME: FULLNAME,
            USERNAME: USERNAME,
            PASSWORD: PASSWORD,
            EMAIL: EMAIL,
            ROLES: ROLE
        });

        res.status(200).send('User registered successfully.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error saving user to database.');
    }
});

// --- LOGIN ---
app.post("/login", async (req, res) => {
    const { USERNAME, PASSWORD } = req.body;

    try {
        const database = client.db(dbName);

        // Check in LT_Students first
        let user = await database.collection("LT_Students").findOne({ USERNAME, PASSWORD });

        // If not found, check in LT_Teachers
        if (!user) {
            user = await database.collection("LT_Teachers").findOne({ USERNAME, PASSWORD });
        }

        if (user) {
            res.status(200).json({
                success: true, message: "Login successful.", role: user.ROLES, user: {
                    FULL_NAME: user.FULL_NAME,
                    EMAIL: user.EMAIL,
                    USERNAME: user.USERNAME
                }
            });
        } else {
            res.status(401).json({ success: false, message: "Invalid username or password." });
            console.log(user);
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// --- SEND OTP ---
app.post("/send-verification-code", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required." });
    }

    const code = Math.floor(100000 + Math.random() * 900000);
    verificationCodes[email] = code;

    try {
        await transporter.sendMail({
            from: '"Learn Track" <learntrackdb@gmail.com>',
            to: email,
            subject: "Your Verification Code",
            text: `Your verification code is: ${code}`,
        });

        res.json({ success: true, message: "OTP sent successfully." });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ success: false, message: "Failed to send OTP." });
    }
});

// --- VERIFY OTP ---
app.post("/verify-code", (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ success: false, message: "Email and code are required." });
    }

    const storedCode = verificationCodes[email];

    if (storedCode && storedCode.toString() === code.toString()) {
        delete verificationCodes[email];
        return res.json({ success: true, message: "Verification successful." });
    } else {
        return res.json({ success: false, message: "Invalid or expired verification code." });
    }
});

// UPLOADING PICTURE TO THE DB
app.post("/upload-profile-picture", async (req, res) => {
    const { image, username } = req.body;

    try {
        const database = client.db(dbName); // Use the same database client

        if (!image || !username) {
            return res.status(400).json({ message: 'Missing image or username' });
        }

        // Check in LT_Students first
        let user = await database.collection("LT_Students").findOne({ USERNAME: username });

        if (!user) {
            // If not found, check in LT_Teachers
            user = await database.collection("LT_Teachers").findOne({ USERNAME: username });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found in any collection' });
        }

        // Update profile picture in the corresponding collection
        if (user) {
            const collectionName = user.ROLES === 'Teacher' ? 'LT_Teachers' : 'LT_Students';

            // Update the profilePicture field
            const updatedUser = await database.collection(collectionName).updateOne(
                { USERNAME: username },
                { $set: { PROFILE_PICTURE: image } }
            );

            if (updatedUser.modifiedCount > 0) {
                res.status(200).json({ message: 'Profile picture updated successfully', user: updatedUser });
            } else {
                res.status(400).json({ message: 'No changes made to the profile picture' });
            }
        }
    } catch (error) {
        console.error("Error updating profile picture:", error);
        res.status(500).json({ message: "Server error during profile picture upload." });
    }
});

// GETTING PROFILE PICTURE
app.get("/get-profile-picture/:username", async (req, res) => {
    const { username } = req.params;

    try {
        const database = client.db(dbName); // Use the same database client

        // Check in LT_Students first
        let user = await database.collection("LT_Students").findOne({ USERNAME: username });

        if (!user) {
            // If not found, check in LT_Teachers
            user = await database.collection("LT_Teachers").findOne({ USERNAME: username });
        }

        if (!user || !user.PROFILE_PICTURE) {
            return res.status(404).json({ message: 'Profile picture not found for this user' });
        }

        // Return the profile picture as base64 string
        res.status(200).json({ PROFILE_PICTURE: user.PROFILE_PICTURE });
    } catch (error) {
        console.error("Error retrieving profile picture:", error);
        res.status(500).json({ message: "Server error during profile picture retrieval." });
    }
});

// STORING UPLOADED FILES IN LT_Workclasses
app.post("/submit-work", upload.single("file"), async (req, res) => {
    const { workclassId, studentUsername, studentName } = req.body;
    const file = req.file;
    const database = client.db(dbName);
  
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
  
    try {
      const base64Data = fs.readFileSync(file.path, { encoding: "base64" });
      const mimeType = file.mimetype;
      const base64String = `data:${mimeType};base64,${base64Data}`;
  
      const collection = database.collection("LT_Workclasses");
  
      // Try updating existing submission
      const updateResult = await collection.updateOne(
        {
          _id: new ObjectId(workclassId),
          "SUBMISSIONS.STUDENTUSERNAME": studentUsername
        },
        {
          $set: {
            "SUBMISSIONS.$.BASE64DATA": base64String,
            "SUBMISSIONS.$.SUBMITTEDAT": new Date(),
            "SUBMISSIONS.$.SUBMITTED": true,
            "SUBMISSIONS.$.FILENAME": file.filename,
            "SUBMISSIONS.$.ORIGINALNAME": file.originalname,
            "SUBMISSIONS.$.STATUS": "Turned In" // <-- Set status to Turned In
          }
        }
      );
  
      if (updateResult.modifiedCount === 0) {
        // No existing submission found, so push a new one
        const newSubmission = {
          _id: new ObjectId(),
          STUDENTUSERNAME: studentUsername,
          FULL_NAME: studentName,
          FILENAME: file.filename,
          ORIGINALNAME: file.originalname,
          SUBMITTEDAT: new Date(),
          SUBMITTED: true,
          STATUS: "Turned In", // <-- Set status to Turned In
          BASE64DATA: base64String
        };
  
        await collection.updateOne(
          { _id: new ObjectId(workclassId) },
          { $push: { SUBMISSIONS: newSubmission } }
        );
  
        return res.status(200).json({ message: "Work submitted successfully", submission: newSubmission });
      }
  
      res.status(200).json({ message: "Work submitted successfully" });
  
    } catch (err) {
      console.error("Submission error:", err);
      res.status(500).json({ message: "Server error during submission" });
    }
  });
  

// -- Attachment Retrieval
app.get('/get-submissions-by-classcode/:classCode/:workclassId', async (req, res) => {
    const { classCode, workclassId } = req.params;

    // Validate that workclassId is a valid ObjectId
    if (!ObjectId.isValid(workclassId)) {
        return res.status(400).json({ message: 'Invalid workclassId format' });
    }

    try {
        // Query using both classCode and workclassId
        
        const db = client.db(dbName);
        const result = await db.collection('LT_Workclasses').find({
            CLASS_CODE: classCode,
            _id: new ObjectId(workclassId)  // Convert workclassId to ObjectId if valid
        }).toArray();

        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'No workclasses found for this class code and workclass ID' });
        }

        const submissions = result.flatMap(workclass => {
            if (!Array.isArray(workclass.SUBMISSIONS)) return [];

            return workclass.SUBMISSIONS.map(sub => ({
                _id: sub._id,
                STUDENTUSERNAME: sub.STUDENTUSERNAME,
                FULL_NAME: sub.FULL_NAME,
                FILENAME: sub.FILENAME,
                ORIGINALNAME: sub.ORIGINALNAME,
                SUBMITTEDAT: sub.SUBMITTEDAT,
                SUBMITTED: sub.SUBMITTED,
                GRADE: sub.GRADE || null,
                WORKCLASS_ID: workclass._id,
                TITLE: workclass.TITLE,
                CLASS_CODE: workclass.CLASS_CODE,
                BASE64DATA: sub.BASE64DATA
            }));
        });

        res.json(submissions);
    } catch (error) {
        console.error('Error in /get-submissions-by-classcode:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

app.get('/get-attachments-by-workclass/:workclassId', async (req, res) => {
    const { workclassId } = req.params;

    if (!ObjectId.isValid(workclassId)) {
        return res.status(400).json({ message: 'Invalid workclassId format' });
    }

    try {
        const db = client.db(dbName);

        const workclass = await db.collection('LT_Workclasses').findOne({
            _id: new ObjectId(workclassId)
        });

        if (!workclass) {
            return res.status(404).json({ message: 'Workclass not found' });
        }

        const attachmentIds = (workclass.ATTACHMENTS || [])
            .filter(id => ObjectId.isValid(id))
            .map(id => new ObjectId(id));

        const attachments = await db.collection('LT_Attachments')
            .find({ _id: { $in: attachmentIds } })
            .toArray();

        const formattedAttachments = attachments.map(att => ({
            NAME: att.name,
            TYPE: att.type,
            SIZE: att.size,
            BASE64DATA: att.base64Data
        }));

        res.json({
            workclass: {
                _id: workclass._id,
                title: workclass.TITLE,
                workclasstype: workclass.WORKCLASSTYPE,
                instructions: workclass.INSTRUCTIONS,
                duedate: workclass.DUEDATE,
                pointspossible: workclass.POINTSPOSSIBLE,
                status: workclass.STATUS,
            },
            attachments: formattedAttachments,
            submissions: workclass.SUBMISSIONS || []
        });

    } catch (error) {
        console.error('Error in /get-attachments-by-workclass:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

  // -- Saving grades in DB
  app.post('/save-grade', async (req, res) => {
    const {classCode, workclassId, submissionId, studentUsername, studentFullName, grade, gradedAt } = req.body;

    if (!workclassId || !studentUsername || grade == null) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const database = client.db(dbName);
        const collection = database.collection("LT_Grades");

        await collection.updateOne(
            {
                CLASSCODE: classCode,
                WORKCLASS_ID: workclassId,
                SUBMISSION_ID: submissionId,
                STUDENT_USERNAME: studentUsername,
            },
            {
                $set: {
                    STUDENT_FULLNAME: studentFullName,
                    GRADE: parseFloat(grade),
                    GRADEDAT: gradedAt || new Date().toISOString(),
                }
            },
            { upsert: true }
        );

        res.json({
            message: 'Graded Successfully',
            studentFullName,
            grade,
            gradedAt: gradedAt || new Date().toISOString(),
        });

    } catch (error) {
        console.error('Error creating grade:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});  

// -- Getting grades from DB
app.get('/rankings/:classCode', async (req, res) => {
    const { classCode } = req.params;

    try {
        const database = client.db(dbName);
        const gradesCollection = database.collection("LT_Grades");
        const usersCollection = database.collection("LT_Students"); // Adjust this if your user collection has a different name

        // Fetch grades for the given classCode
        const records = await gradesCollection.find({ CLASSCODE: classCode }).toArray();

        // Collect all usernames to look up profile pictures in bulk
        const usernames = records.map(r => r.STUDENT_USERNAME);
        const users = await usersCollection
            .find({ USERNAME: { $in: usernames } })
            .toArray();

        // Create a lookup table for quick access
        const userMap = {};
        users.forEach(user => {
            userMap[user.USERNAME] = user.PROFILE_PICTURE || null; // base64 image expected
        });

        // Build rankings list with profile pictures
        const rankings = records.map(record => ({
            name: record.STUDENT_FULLNAME,
            score: record.GRADE,
            avatar: userMap[record.STUDENT_USERNAME] || null // base64 image if available
        }));

        // Sort by score descending
        rankings.sort((a, b) => b.score - a.score);

        res.json(rankings);
    } catch (error) {
        console.error('Error fetching rankings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Run every 5 minutes
cron.schedule('* * * * *', async () => {
    //console.log("Checking all workclasses for upcoming reminders...");

    try {
        await client.connect();
        const db = client.db(dbName);

        const now = new Date();

        // Get all workclasses with a future due date
        const upcomingWorkclasses = await db.collection('LT_Workclasses')
            .find({ DUEDATE: { $gte: now } })
            .toArray();

        for (const workclass of upcomingWorkclasses) {
            if (!workclass._id || !workclass.CLASS_CODE) continue;

            try {
                await axios.post(`http://localhost:${PORT}/send-email-due-soon`, {
                    workclassId: workclass._id.toString(),
                    classCode: workclass.CLASS_CODE
                });
            } catch (err) {
                console.error(`Failed to process workclass ${workclass._id}:`, err.message);
            }
        }
    } catch (error) {
        console.error('Error checking workclasses:', error.message);
    }
});

// // SENDING EMAIL TO NOTIFY THAT AN ACTIVITY IS DUE
   const reminderIntervals = [18, 12, 6, 3]; // in hours
// const reminderWindows = reminderIntervals.map(h => h * 60); // convert to minutes

app.post("/send-email-due-soon", async (req, res) => {
    const { workclassId, classCode } = req.body;

    if (!workclassId || !classCode) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    let objectId;
    try {
        objectId = new ObjectId(workclassId);
    } catch (e) {
        console.error("Invalid ObjectId:", workclassId);
        return res.status(400).json({ error: "Invalid workclassId format." });
    }

    try {
        const db = client.db(dbName);


        const workclassDoc = await db.collection("LT_Workclasses").findOne({
            _id: objectId,
            CLASS_CODE: classCode
        });

        if (!workclassDoc) {
            return res.status(404).json({ error: "Workclass not found." });
        }

        const dueDate = new Date(workclassDoc.DUEDATE);
        const now = new Date();
        const minutesUntilDue = Math.floor((dueDate - now) / (1000 * 60));

        // console.log(`Now: ${now}`);
        // console.log(`Due: ${dueDate}`);
        // console.log(`Minutes until due: ${minutesUntilDue}`);

        // Check if the remaining time is exactly 1080, 720, 360, or 180 minutes
        const allowedMinutes = [1080, 720, 360, 180];
        if (!allowedMinutes.includes(minutesUntilDue)) {
            return res.status(200).json({ message: "No reminder needed at this time." });
        }



        // Derive interval in hours
        const interval = minutesUntilDue / 60;

        const remindersCollection = db.collection("LT_Reminders");
        const existingReminder = await remindersCollection.findOne({
            WORKCLASS_ID: workclassId,
            INTERVAL_HOURS: interval
        });

        // Delete previous reminder if exists
        if (existingReminder) {
            await remindersCollection.deleteOne({ _id: existingReminder._id });
        }

        const title = workclassDoc.TITLE;

        const classDoc = await db.collection("LT_Classes").findOne({ CLASS_CODE: classCode });

        if (!classDoc || !Array.isArray(classDoc.STUDENTS)) {
            return res.status(404).json({ error: "No students found for this class." });
        }

        const className = classDoc.CLASS_NAME || classCode;
        const message = `Dear students, the workclass "${title}" in your class "${className}" is due on ${dueDate.toLocaleString()}. Please make sure to submit it on time!`;

        const subject = `Reminder (${interval} hrs left): ${title} is due soon!`;

        const usernames = classDoc.STUDENTS.map(student => student.USERNAME).filter(Boolean);
        const users = await db.collection("LT_Students").find({ USERNAME: { $in: usernames } }).toArray();
        const emails = users.map(u => u.EMAIL).filter(Boolean);

        if (emails.length === 0) {
            return res.status(404).json({ error: "No valid student emails found." });
        }

        await Promise.all(
            emails.map(email =>
                transporter.sendMail({
                    from: '"Learn Track" <learntrackdb@gmail.com>',
                    to: email,
                    subject,
                    text: message,
                }).catch(err => {
                    console.error(`Failed to send email to ${email}:`, err);
                })
            )
        );

        // Insert new reminder record
        await db.collection("LT_Reminders").insertOne({
            WORKCLASS_ID: workclassId,
            CLASS_CODE: classCode,
            INTERVAL_HOURS: interval,
            SENT_AT: new Date()
        });

        res.status(200).json({ message: `Sent ${interval}-hour reminder about "${title}" to ${emails.length} students.` });

    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Server error." });
    }
});

app.post("/send-email-in-one-day", async (req, res) => {
    const { workclassId, classCode } = req.body;

    if (!workclassId || !classCode) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    let objectId;
    try {
        objectId = new ObjectId(workclassId);
    } catch (e) {
        console.error("Invalid ObjectId:", workclassId);
        return res.status(400).json({ error: "Invalid workclassId format." });
    }

    try {
        const db = client.db(dbName);

        const workclassDoc = await db.collection("LT_Workclasses").findOne({
            _id: objectId,
            CLASS_CODE: classCode
        });

        const newDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const updateResult = await db.collection("LT_Workclasses").updateOne(
            { _id: objectId, CLASS_CODE: classCode },
            { $set: { DUEDATE: newDueDate } }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ error: "Workclass not found or class code mismatch." });
        }

        if (!workclassDoc) {
            return res.status(404).json({ error: "Workclass not found." });
        }

        const title = workclassDoc.TITLE;
        const dueDate = new Date(workclassDoc.DUEDATE);

        const subject = `Reminder: ${title} is ending in 24 hrs!`;


        const classDoc = await db.collection("LT_Classes").findOne({ CLASS_CODE: classCode });

        if (!classDoc || !Array.isArray(classDoc.STUDENTS)) {
            return res.status(404).json({ error: "No students found for this class." });
        }
        
        const className = classDoc.CLASS_NAME || classCode; // fallback if name is missing
        const message = `Dear students, the workclass "${title}" in your class "${className}" is due on ${newDueDate.toLocaleString()}. Please make sure to submit it on time!`;

        console.log("Class document:", classDoc);

        const usernames = classDoc.STUDENTS.map(student => student.USERNAME).filter(Boolean);

        if (usernames.length === 0) {
            return res.status(404).json({ error: "No student usernames found." });
        }

        const users = await db.collection("LT_Students").find({ USERNAME: { $in: usernames } }).toArray();
        const emails = users.map(u => u.EMAIL).filter(Boolean);

        if (emails.length === 0) {
            return res.status(404).json({ error: "No valid student emails found." });
        }

        await Promise.all(
            emails.map(email =>
                transporter.sendMail({
                    from: '"Learn Track" <learntrackdb@gmail.com>',
                    to: email,
                    subject,
                    text: message,
                }).catch(err => {
                    console.error(`Failed to send email to ${email}:`, err);
                })
            )
        );

        res.status(200).json({ message: `Sent reminder about "${title}" to ${emails.length} students.` });

    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Server error." });
    }
});

app.post("/join-class/:classCode/students", async (req, res) => {
    const { student } = req.body;
    const classCode = req.params.classCode;

    if (!student || !student.USERNAME || !student.NAME) {
        return res.status(400).json({ message: "Missing student info." });
    }

    try {
        const database = client.db(dbName);
        const collection = database.collection("LT_Classes");

        const result = await collection.updateOne(
            { CLASS_CODE: classCode },
            { $addToSet: { STUDENTS: student } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Class not found." });
        }

        res.status(200).json({ message: "Student successfully joined the class." });
    } catch (error) {
        console.error("Error joining class:", error);
        res.status(500).json({ message: "Server error while joining class." });
    }
});

//PROFESSOR FUNCTIONALITIES
app.post("/create-class", async (req, res) => {
    const { USERNAME, CLASS_NAME, CLASS_CODE, SECTION, NAME } = req.body;

    try {
        const database = client.db(dbName);
        const collection = database.collection("LT_Classes");

        await collection.insertOne({
            USERNAME,
            CLASS_NAME,
            CLASS_CODE,
            SECTION,
            NAME,
        });

        res.status(200).json({ message: 'Class registered successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving class to database.');
    }
});

app.post("/create-announcements", async (req, res) => {
    const { CLASS_CODE, USERNAME, EMAIL, CONTENT, DATE } = req.body;

    try {
        const database = client.db(dbName);
        const teachers = database.collection("LT_Teachers");

        // Find the professor's full name using USERNAME or EMAIL
        const teacher = await teachers.findOne({
            $or: [
                { USERNAME: USERNAME },
                { EMAIL: EMAIL }
            ]
        });

        if (!teacher) {
            return res.status(404).json({ message: "Professor not found." });
        }

        const collection = database.collection("LT_Announcement");

        await collection.insertOne({
            CLASS_CODE,
            NAME: teacher.FULL_NAME, // Use the full name from the database
            EMAIL,
            CONTENT,
            DATE,
        });

        res.status(200).json({ message: 'Announcement created successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving announcement to database.');
    }
});

app.get("/announcements/:classCode", async (req, res) => {
    const { classCode } = req.params;
    const collection = client.db(dbName).collection("LT_Announcement");

    try {
        const announcements = await collection.find({ CLASS_CODE: classCode }).toArray();
        res.status(200).json(announcements);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving announcements.');
    }
 });

app.delete('/delete-announcement/:id', async (req, res) => {
    const { id } = req.params;
    const db = client.db(dbName);

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid announcement ID.' });
    }

    try {
        const result = await db.collection('LT_Announcement').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 1) {
            res.status(200).json({ message: 'Announcement deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Announcement not found.' });
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ message: 'Server error while deleting announcement.' });
    }
});

// Working for only assignments and material type classwork.

app.post("/create-workclass", async (req, res) => {
    const { 
        CLASS_CODE,
        TITLE,
        WORKCLASSTYPE,
        INSTRUCTIONS,
        QUESTIONS,
        TIMELIMIT,
        STARTDATETIME,
        ENDDATETIME,
        POINTSPOSSIBLE,
        DESCRIPTION,
        DUEDATE,
        ALLOWLATESUBMISSIONS,
        GRADEIMMEDIATELY,
        ATTACHMENTS, 
        STATUS
    } = req.body;

    let base64Data = null;
    if (req.files && req.files.ATTACHMENTS) {
        const file = req.files.ATTACHMENTS[0]; 
        const fileData = fs.readFileSync(file.path); 
        base64Data = `data:${file.mimetype};base64,${fileData.toString('base64')}`;
        fs.unlinkSync(file.path);  
    }

    if (!CLASS_CODE || !TITLE || !WORKCLASSTYPE) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    let dueDate = null;
    if (WORKCLASSTYPE === 'assignment' && DUEDATE) {
        dueDate = new Date(DUEDATE);
        if (isNaN(dueDate.getTime())) {
            return res.status(400).json({ error: "Invalid due date format." });
        }
    }

    try {
        const db = client.db(dbName);

        // --- DUPLICATE CHECK ---
        // const duplicate = await db.collection("LT_Workclasses").findOne({
        //     CLASS_CODE,
        //     TITLE,
        //     WORKCLASSTYPE
        // });
        // if (duplicate) {
        //     return res.status(409).json({ error: "A workclass with this title and type already exists in this class." });
        // }
        // --- END DUPLICATE CHECK ---

        // Fetch students in the class
        const classDoc = await db.collection("LT_Classes").findOne({ CLASS_CODE });
        const students = (classDoc && Array.isArray(classDoc.STUDENTS)) ? classDoc.STUDENTS : [];

        // Prepare SUBMISSIONS array with default status "Assigned"
        const SUBMISSIONS = students.map(student => ({
            STUDENTUSERNAME: student.USERNAME,
            FULL_NAME: student.NAME || student.FULL_NAME || "",
            STATUS: "Assigned",
            SUBMITTED: false
        }));

        const newWorkclass = {
            CLASS_CODE,
            TITLE,
            WORKCLASSTYPE,
            STATUS: STATUS || "published",
            CREATED_AT: new Date().toISOString(),
            ATTACHMENTS: base64Data || ATTACHMENTS,
            SUBMISSIONS // Add the default submissions array
        };

        if (WORKCLASSTYPE === "quiz") {
            Object.assign(newWorkclass, {
                INSTRUCTIONS,
                QUESTIONS,
                TIMELIMIT,
                STARTDATETIME,
                ENDDATETIME,
                POINTSPOSSIBLE
            });
        } else if (WORKCLASSTYPE === "material") {
            newWorkclass.DESCRIPTION = DESCRIPTION;
        } else if (WORKCLASSTYPE === "question") {
            Object.assign(newWorkclass, {
                INSTRUCTIONS,
                POINTSPOSSIBLE,
                DUEDATE: dueDate, 
                TYPE: "question"
            });
        } else if (WORKCLASSTYPE === "assignment") {
            Object.assign(newWorkclass, {
                INSTRUCTIONS,
                DUEDATE: dueDate,  
                POINTSPOSSIBLE,
                ALLOWLATESUBMISSIONS,
                GRADEIMMEDIATELY
            });
        } else {
            return res.status(400).json({ error: "Invalid workclass type." });
        }

        const collection = db.collection("LT_Workclasses");
        await collection.insertOne(newWorkclass);

        res.status(200).json({ message: "Workclass created successfully." });
    } catch (error) {
        console.error("Error inserting workclass:", error);
        res.status(500).send("Error saving workclass to database.");
    }
});

    app.delete('/delete-workclass/:classCode/:workclassId', async (req, res) => {
        const { classCode, workclassId } = req.params;
        const db = client.db(dbName);

        try {
            const result = await db.collection('LT_Workclasses').deleteOne({
                _id: new ObjectId(workclassId),
                CLASS_CODE: classCode
            });

            if (result.deletedCount === 1) {
                res.status(200).json({ message: 'Workclass deleted successfully.' });
            } else {
                res.status(404).json({ message: 'Workclass not found.' });
            }
        } catch (error) {
            console.error('Error deleting workclass:', error);
            res.status(500).json({ message: 'Server error while deleting workclass.' });
        }
    });



  // Display Worksclasses
  app.get("/get-workclasses", async (req, res) => {
    const { CLASS_CODE } = req.query;
  
    if (!CLASS_CODE) {
      return res.status(400).json({ error: "Missing required query parameter: CLASS_CODE." });
    }
  
    try {
      const db = client.db(dbName);
      const collection = db.collection("LT_Workclasses");
  
      const workclasses = await collection.find({ CLASS_CODE }).toArray();
  
      res.status(200).json(workclasses);
    } catch (error) {
      console.error("Error retrieving workclasses:", error);
      res.status(500).send("Error retrieving workclasses from database.");
    }
  });  

app.get("/view-workclass/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Missing required parameter: id." });
  }

  try {
    const db = client.db(dbName);
    const collection = db.collection("LT_Workclasses");

    const workclass = await collection.findOne({ _id: new ObjectId(id) });

    if (!workclass) {
      return res.status(404).json({ error: "Workclass not found." });
    }

    res.status(200).json(workclass);
  } catch (error) {
    console.error("Error retrieving workclass by ID:", error);
    res.status(500).send("Error retrieving workclass from database.");
  }
});



app.get("/show-announcements", async (req, res) => {
    const classCode = req.query.CLASS_CODE;

    try {
        const database = client.db(dbName);
        const collection = database.collection("LT_Announcement");

        const query = classCode ? { CLASS_CODE: classCode } : {};

        const announcements = await collection
            .find(query)
            .sort({ DATE: -1 }) // Optional: Sort by most recent
            .toArray();

        res.status(200).json(announcements);
    } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).send("Error fetching announcements from database.");
    }
});

app.get("/classes", async (req, res) => {
    try {
        const username = req.query.username;

        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        const database = client.db(dbName);
        const collection = database.collection("LT_Classes");

        const classes = await collection.find({ USERNAME: username }).toArray();

        res.json(classes);
    } catch (err) {
        console.error("Error fetching classes:", err);
        res.status(500).json({ message: "Failed to fetch classes" });
    }
});

app.get("/active-courses", async (req, res) => {
    try {
        const username = req.query.username;

        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        const database = client.db(dbName);
        const collection = database.collection("LT_Classes");

        const activeCount = await collection.countDocuments({
            USERNAME: username,
        });

        res.json({ activeCourses: activeCount });
    } catch (err) {
        console.error("Error fetching active course count:", err);
        res.status(500).json({ message: "Failed to fetch active course count" });
    }
});

app.get("/section-count", async (req, res) => {
    try {
        const username = req.query.username;

        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        const database = client.db(dbName);
        const collection = database.collection("LT_Classes");

        const results = await collection.aggregate([
            { $match: { USERNAME: username } },
            { $group: { _id: "$SECTION" } },
            { $count: "uniqueSections" }
        ]).toArray();

        const sectionCount = results.length > 0 ? results[0].uniqueSections : 0;

        res.json({ sectionsHandled: sectionCount });
    } catch (err) {
        console.error("Error fetching section count:", err);
        res.status(500).json({ message: "Failed to fetch section count" });
    }
});

app.get("/student-count", async (req, res) => {
    try {
        const username = req.query.username;

        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        const database = client.db(dbName);
        const collection = database.collection("LT_Classes");

        const classes = await collection.find({ USERNAME: username }).toArray();

        const studentUsernamesSet = new Set();

        classes.forEach(cls => {
            if (Array.isArray(cls.STUDENTS)) {
                cls.STUDENTS.forEach(student => {
                    if (student.USERNAME !== username) {
                        studentUsernamesSet.add(student.USERNAME);
                    }
                });
            }
        });

        const uniqueStudentCount = studentUsernamesSet.size;

        res.json({ uniqueStudents: uniqueStudentCount });
    } catch (err) {
        console.error("Error fetching student count:", err);
        res.status(500).json({ message: "Failed to fetch student count" });
    }
});

    app.get("/class-students/:classCode", async (req, res) => {
        try {
            const classCode = req.params.classCode;

            const database = client.db(dbName);
            const collection = database.collection("LT_Classes");

            const cls = await collection.findOne({ CLASS_CODE: classCode });

            if (!cls) {
                return res.status(404).json({ message: "Class not found" });
            }

            res.json(cls.STUDENTS || []);
        } catch (err) {
            console.error("Error fetching class students:", err);
            res.status(500).json({ message: "Failed to fetch students" });
        }
    });

//STUDENT FUNCTIONALITIES
// -- getting student classes
app.get("/student-classes", async (req, res) => {
    try {
        const username = req.query.username;

        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        const database = client.db(dbName);
        const collection = database.collection("LT_Classes");

        const classes = await collection.find({
            STUDENTS: { $elemMatch: { USERNAME: username } }
        }).toArray();

        res.json(classes);
    } catch (err) {
        console.error("Error fetching classes:", err);
        res.status(500).json({ message: "Failed to fetch classes" });
    }
});

app.get("/show-student-grades", async (req, res) => {
    try {
        const username = req.query.username;

        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        const database = client.db(dbName);
        const gradesCollection = database.collection("LT_Grades");

        const gradesWithDetails = await gradesCollection.aggregate([
            {
                $match: {
                    STUDENT_USERNAME: username
                }
            },
            {
                $addFields: {
                    workclassObjId: { $toObjectId: "$WORKCLASS_ID" }
                }
            },
            {
                $lookup: {
                    from: "LT_Workclasses",
                    localField: "workclassObjId",
                    foreignField: "_id",
                    as: "workclassDetails"
                }
            },
            {
                $unwind: {
                    path: "$workclassDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "LT_Classes",
                    localField: "CLASSCODE",
                    foreignField: "CLASS_CODE",
                    as: "classDetails"
                }
            },
            {
                $unwind: {
                    path: "$classDetails",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]).toArray();

        res.json(gradesWithDetails);
    } catch (err) {
        console.error("Error fetching student grades with full details:", err);
        res.status(500).json({ message: "Failed to fetch student grades" });
    }
});


// -- showing student count
app.get("/student-workclasses-count/:username", async (req, res) => {
    const { username } = req.params;

    if (!username) {
        return res.status(400).json({ error: "Missing username." });
    }

    try {
        const db = client.db(dbName);

        const joinedClasses = await db.collection("LT_Classes").find({
            "STUDENTS.USERNAME": username
        }).toArray();

        if (joinedClasses.length === 0) {
            return res.status(200).json({ count: 0, workclasses: [] });
        }

        const joinedClassCodes = joinedClasses.map(cls => cls.CLASS_CODE);

        const workclasses = await db.collection("LT_Workclasses").find({
            CLASS_CODE: { $in: joinedClassCodes }
        }).toArray();

        res.status(200).json({
            count: workclasses.length,
            workclasses: workclasses
        });

    } catch (error) {
        console.error("Error fetching student workclasses:", error);
        res.status(500).json({ error: "Server error." });
    }
});

app.post('/invite-student', async (req, res) => {
    const { name, email, classCode } = req.body;

    if (!name || !email || !classCode) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    try {
        const db = client.db(dbName);

        // 1. Find the student in LT_Students
        const student = await db.collection("LT_Students").findOne({
            FULL_NAME: name,
            EMAIL: email
        });

        if (!student) {
            return res.status(404).json({ error: "Student not found." });
        }

        // 2. Add student to the class's STUDENTS array if not already present
        const classCollection = db.collection("LT_Classes");
        const classDoc = await classCollection.findOne({ CLASS_CODE: classCode });

        if (!classDoc) {
            return res.status(404).json({ error: "Class not found." });
        }

        // Check if student already in class
        const alreadyInClass = (classDoc.STUDENTS || []).some(s => s.EMAIL === email);

        if (alreadyInClass) {
            return res.status(409).json({ error: "Student already in this class." });
        }

        // Add student to class
        await classCollection.updateOne(
            { CLASS_CODE: classCode },
            { $push: { STUDENTS: { 
                USERNAME: student.USERNAME, 
                NAME: student.FULL_NAME, // Add this line for compatibility
                EMAIL: student.EMAIL 
            } } }
        );

        res.status(200).json({ message: "Student added to class successfully." });
    } catch (error) {
        console.error("Error inviting student:", error);
        res.status(500).json({ error: "Server error." });
    }
});

app.delete('/delete-class/:classCode', async (req, res) => {
    const { classCode } = req.params;
    console.log("Attempting to delete class with CLASS_CODE:", classCode);

    const database = client.db(dbName);
    const collection = database.collection("LT_Classes");

    try {
        const result = await collection.deleteOne({ CLASS_CODE: classCode });

        if (result.deletedCount === 1) {
            res.status(200).json({ message: `Class with CLASS_CODE ${classCode} deleted successfully.` });
        } else {
            res.status(404).json({ message: `No class found with CLASS_CODE ${classCode}` });
        }
    } catch (err) {
        console.error("Error during deletion:", err);
        res.status(500).json({ message: 'Error deleting class: ' + err.message });
    }
});


//STUDENT FUNCTIONALITIES
app.get("/student-classes", async (req, res) => {
    try {
        const username = req.query.username;

        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        const database = client.db(dbName);
        const collection = database.collection("LT_Classes");

        const classes = await collection.find({
            STUDENTS: { $elemMatch: { USERNAME: username } }
        }).toArray();

        res.json({ 
            classes, 
            count: classes.length 
          });
          
    } catch (err) {
        console.error("Error fetching classes:", err);
        res.status(500).json({ message: "Failed to fetch classes" });
    }
});





// --- START SERVER AND CONNECT DB ---
client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`✅ Server running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error("❌ Failed to connect to MongoDB", err);
    });

    
