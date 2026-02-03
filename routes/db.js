const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://markchristianmusngi:hFAVDl2dxXBi7PnC@cluster0.gbhjoro.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

let db;

async function connectToDatabase() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('Connected successfully to server');
        db = client.db('CateringServices');
    } catch (error) {
        console.error('Could not connect to database', error);
        throw error;
    }
}

function getDb() {
    if (!db) {
        throw new Error('Database not connected');
    }
    return db;
}

module.exports = { connectToDatabase, getDb };
