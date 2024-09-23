// jest.setup.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
    try {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        console.log(`In-memory MongoDB server started at ${uri}`);

        await mongoose.connect(uri);
        console.log('Mongoose connected to in-memory MongoDB');
    } catch (error) {
        console.error('Failed to start in-memory MongoDB server:', error);
        throw error; // Ensure tests fail if setup fails
    }
});

afterAll(async () => {
    try {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        if (mongoServer) {
            await mongoServer.stop();
            console.log('In-memory MongoDB server stopped');
        }
    } catch (error) {
        console.error('Failed to stop in-memory MongoDB server:', error);
    }
});

afterEach(async () => {
    try {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany();
        }
        console.log('Cleared all collections');
    } catch (error) {
        console.error('Failed to clear collections:', error);
    }
});
