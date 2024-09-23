// src/index.js

require('dotenv').config();
const express = require("express");
const path = require("path");
const hbs = require("hbs");
const xml2js = require('xml2js');
const multer = require('multer');
const mongoose = require("mongoose");

const app = express();
const templatePath = path.join(__dirname, '../templates');

// Middleware Setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// View Engine Setup
app.set("view engine", "hbs");
app.set("views", templatePath);

// Home Route
app.get("/", (req, res) => {
    res.render("home");
});

// MongoDB Connection (Only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nun';

    mongoose.connect(mongoUri)
        .then(() => {
            console.log("MongoDB connected");
        })
        .catch((err) => {
            console.error("Failed to connect to MongoDB", err);
        });
}

// Multer Configuration for File Uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper Function to Flatten Arrays in Parsed XML
const flattenArray = (obj) => {
    Object.keys(obj).forEach((key) => {
        if (Array.isArray(obj[key]) && obj[key].length === 1) {
            obj[key] = obj[key][0];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            flattenArray(obj[key]);
        }
    });
};

// Helper Function to Parse XML Data
const parseXML = (xmlData) => {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xmlData, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

// POST Route to Handle XML File Uploads
app.post("/enter", upload.array('xmlFiles', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    try {
        const results = [];

        for (const file of req.files) {
            try {
                // Parse XML File
                const parsedXML = await parseXML(file.buffer.toString());

                // Derive Collection Name from File Name
                const fileName = file.originalname.replace(/\.[^/.]+$/, "");

                // Dynamically Create or Retrieve Mongoose Model
                let DynamicModel;
                try {
                    DynamicModel = mongoose.model(fileName);
                } catch (e) {
                    // If model doesn't exist, create a new one with a flexible schema
                    DynamicModel = mongoose.model(fileName, new mongoose.Schema({}, { strict: false }));
                }

                // Extract Array Elements from Parsed XML
                let arrayElements = null;
                Object.keys(parsedXML).forEach((key) => {
                    if (Array.isArray(parsedXML[key])) {
                        arrayElements = parsedXML[key];
                    } else if (typeof parsedXML[key] === 'object' && parsedXML[key] !== null) {
                        Object.keys(parsedXML[key]).forEach((nestedKey) => {
                            if (Array.isArray(parsedXML[key][nestedKey])) {
                                arrayElements = parsedXML[key][nestedKey];
                            }
                        });
                    }
                });

                if (!arrayElements) {
                    console.error(`No valid array element found in the XML for file: ${fileName}`);
                    results.push(`${fileName}: No valid data found.`);
                    continue;
                }

                // Flatten and Save Each Element to MongoDB
                for (const element of arrayElements) {
                    flattenArray(element);
                    const document = new DynamicModel(element);
                    await document.save();
                }

                console.log(`Records from ${fileName} appended successfully.`);
                results.push(`${fileName}: Records appended successfully.`);
            } catch (err) {
                console.error(`Error processing file ${file.originalname}:`, err);
                results.push(`${file.originalname}: Failed to process.`);
            }
        }

        res.send(`Results:\n${results.join('\n')}`);
    } catch (error) {
        console.error('Error inserting data into the database:', error);
        res.status(500).send('An error occurred while saving to the database.');
    }
});

// Export the Express App for Testing
module.exports = app;

// Start the Server Only If Not in Test Environment
if (process.env.NODE_ENV !== 'test') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}
