const express = require("express");
const path = require("path");
const hbs = require("hbs");
const xml2js = require('xml2js');
const multer = require('multer');
const mongoose = require("mongoose");

const app = express();
const templatePath = path.join(__dirname, '../templates');

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/nun", {
 //   useNewUrlParser: true,
  //  useUnifiedTopology: true
})
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((err) => {
        console.log("Failed to connect to MongoDB", err);
    });

// Schema for dynamic data insertion
const xmlSchema = new mongoose.Schema({}, { strict: false }); // No predefined schema
const XmlCollection = mongoose.model('XmlCollection', xmlSchema);

// Setting up Multer for file uploads (storing in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to parse form data and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set view engine and path
app.set("view engine", "hbs");
app.set("views", templatePath);

// Route to display the form page
app.get("/", (req, res) => {
    res.render("home");
});

// POST route to handle XML upload and storage
app.post("/enter", upload.single('xmlFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Parse the XML file content
    xml2js.parseString(req.file.buffer.toString(), async (err, result) => {
        if (err) {
            console.error('Error parsing XML:', err);
            return res.status(400).send('Invalid XML format');
        }

        // Log parsed XML
        console.log('Parsed XML:', JSON.stringify(result, null, 2));

        // Try saving parsed data to MongoDB
        try {
            const xmlDocument = new XmlCollection(result); // Save entire XML structure
            await xmlDocument.save();
            res.send('XML data successfully saved to the database');
        } catch (error) {
            console.error('Error inserting data into the database:', error);
            res.status(500).send('An error occurred while saving to the database');
        }
    });
});

// Start the server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
