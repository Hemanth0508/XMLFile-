// src/__tests__/enter.test.js

const request = require('supertest');
const path = require('path');
const app = require('../index'); // Import the Express app

describe('POST /enter', () => {
    it('should upload XML files and return success message', async () => {
        const res = await request(app)
            .post('/enter')
            .attach('xmlFiles', path.join(__dirname, 'sample.xml')); // Ensure 'sample.xml' exists

        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Records appended successfully.');
    });

    it('should return 400 when no files are uploaded', async () => {
        const res = await request(app)
            .post('/enter');

        expect(res.statusCode).toEqual(400);
        expect(res.text).toBe('No files uploaded.');
    });
});
