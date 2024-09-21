const express = require("express");
const path = require("path");
const hbs = require("hbs");
const xml2js = require('xml2js');
const multer = require('multer');
const mongoose = require("mongoose");

const app = express();
const templatePath = path.join(__dirname, '../templates');


mongoose.connect("mongodb://localhost:27017/nun", {

})
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


app.post("/enter", upload.array('xmlFiles', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    try {
        for (const file of req.files) {
            
            xml2js.parseString(file.buffer.toString(), async (err, result) => {
                if (err) {
                    console.error('Error parsing XML:', err);
                    return res.status(400).send('Invalid XML format');
                }

               
                const fileName = file.originalname.replace(/\.[^/.]+$/, ""); 

               
                let DynamicModel;
                try {
                    DynamicModel = mongoose.model(fileName); 
                } catch (e) {
                    
                    DynamicModel = mongoose.model(fileName, new mongoose.Schema({}, { strict: false }));
                }

               
                let arrayElements = null;
                Object.keys(result).forEach((key) => {
                    if (Array.isArray(result[key])) {
                        arrayElements = result[key];
                    } else if (typeof result[key] === 'object') {
                        Object.keys(result[key]).forEach((nestedKey) => {
                            if (Array.isArray(result[key][nestedKey])) {
                                arrayElements = result[key][nestedKey]; 
                            }
                        });
                    }
                });

                if (!arrayElements) {
                    return res.status(400).send('No valid array element found in the XML.');
                }

                
                for (const element of arrayElements) {
                    flattenArray(element); 
                    const document = new DynamicModel(element);
                    await document.save(); 
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


app.listen(3000, () => {
    console.log("Server running on port 3000");
});
