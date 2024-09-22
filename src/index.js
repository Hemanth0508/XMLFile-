const express = require("express");
const path = require("path");
const hbs = require("hbs");
const xml2js = require('xml2js');
const multer = require('multer');
const mongoose = require("mongoose");
require('dotenv').config();


const app = express();
const templatePath = path.join(__dirname, '../templates');

const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri, {})
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((err) => {
        console.log("Failed to connect to MongoDB", err);
    });

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "hbs");
app.set("views", templatePath);

app.get("/", (req, res) => {
    res.render("home");
});


const flattenArray = (obj) => {
    Object.keys(obj).forEach((key) => {
        if (Array.isArray(obj[key]) && obj[key].length === 1) {
            obj[key] = obj[key][0];
        } else if (typeof obj[key] === 'object') {
            flattenArray(obj[key]);
        }
    });
};


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

app.post("/enter", upload.array('xmlFiles', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    try {
        const results = [];

        for (const file of req.files) {
            try {
                const parsedXML = await parseXML(file.buffer.toString());

                const fileName = file.originalname.replace(/\.[^/.]+$/, "");

                
                let DynamicModel;
                try {
                    DynamicModel = mongoose.model(fileName);
                } catch (e) {
                    DynamicModel = mongoose.model(fileName, new mongoose.Schema({}, { strict: false }));
                }

                
                let arrayElements = null;
                Object.keys(parsedXML).forEach((key) => {
                    if (Array.isArray(parsedXML[key])) {
                        arrayElements = parsedXML[key];
                    } else if (typeof parsedXML[key] === 'object') {
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

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
