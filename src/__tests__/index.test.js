// src/__tests__/index.test.js

const request = require('supertest');
const app = require('../index'); // Import the Express app

describe('GET /', () => {
    it('should return 200 OK and render the home page', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Upload XML Files'); // Updated expectation
    });
});
