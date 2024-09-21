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
 //   useUnifiedTopology: true
})
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((err) => {
        console.log("Failed to connect to MongoDB", err);
    });

// Setting up Multer for multiple file uploads (storing in memory)
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

// Helper function to flatten arrays with single values
const flattenArray = (obj) => {
    Object.keys(obj).forEach((key) => {
        if (Array.isArray(obj[key]) && obj[key].length === 1) {
            obj[key] = obj[key][0]; // Flatten single-value arrays
        } else if (typeof obj[key] === 'object') {
            flattenArray(obj[key]); // Recursively flatten nested objects
        }
    });
};

// Route to handle XML file upload and append to the collection if it exists
app.post("/enter", upload.array('xmlFiles', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    try {
        for (const file of req.files) {
            // Parse the XML file content
            xml2js.parseString(file.buffer.toString(), async (err, result) => {
                if (err) {
                    console.error('Error parsing XML:', err);
                    return res.status(400).send('Invalid XML format');
                }

                // Extract file name (without extension) for collection name
                const fileName = file.originalname.replace(/\.[^/.]+$/, ""); // Removes the extension

                // Dynamically check if the model (collection) already exists
                let DynamicModel;
                try {
                    DynamicModel = mongoose.model(fileName); // Get the model if it exists
                } catch (e) {
                    // If the model does not exist, create it
                    DynamicModel = mongoose.model(fileName, new mongoose.Schema({}, { strict: false }));
                }

                // Find the first array-like element in the XML structure
                let arrayElements = null;
                Object.keys(result).forEach((key) => {
                    if (Array.isArray(result[key])) {
                        arrayElements = result[key]; // If the key points to an array
                    } else if (typeof result[key] === 'object') {
                        Object.keys(result[key]).forEach((nestedKey) => {
                            if (Array.isArray(result[key][nestedKey])) {
                                arrayElements = result[key][nestedKey]; // Nested array found
                            }
                        });
                    }
                });

                if (!arrayElements) {
                    return res.status(400).send('No valid array element found in the XML.');
                }

                // Iterate through each element, flatten its properties before saving, and append to the collection
                for (const element of arrayElements) {
                    flattenArray(element); // Flatten single-value arrays
                    const document = new DynamicModel(element);
                    await document.save(); // Save the document (append new data)
                }

                console.log(`Records from ${fileName} appended successfully.`);
            });
        }
        res.send('All XML files and records successfully appended to the database.');
    } catch (error) {
        console.error('Error inserting data into the database:', error);
        res.status(500).send('An error occurred while saving to the database.');
    }
});

// Start the server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
