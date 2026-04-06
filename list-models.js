require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        // The SDK doesn't have a direct 'listModels' in the client usually, 
        // researchers usually use the REST API or check the error.
        // Let's try a different approach to debug.
        console.log('Testing with gemini-1.5-flash...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        console.log('Available Models:');
        if (data.models) {
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log('No models found or error:', data);
        }
    } catch (err) {
        console.error('Error listing models:', err);
    }
}

listModels();
