require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');

const { sequelize, connectDB } = require('./db');
const Note = require('./models/Note');
const Connection = require('./models/Connection');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});
app.set('io', io);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

let model;
if (GOOGLE_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
    });
  } catch (error) {
    console.error('🔥 Failed to initialize AI model:', error.message);
  }
} else {
  console.warn('⚠️ GOOGLE_API_KEY not set — AI features disabled');
}

const cleanMarkdown = (text) => text.replace(/```json/g, '').replace(/```/g, '').trim();

const formatResponse = async (task, prompt) => {
  if (!model) {
    throw new Error('AI model is not configured');
  }

  const prompts = {
    correct_sentence: `Correct the grammar and structure of this sentence without explanation:\n"${prompt}"`,
    word_suggestions: `Suggest 3-5 alternative words for each significant word in this text (exclude articles and prepositions). Return suggestions in JSON:\n"${prompt}"`,
    summarize: `Summarize this text in 1-2 sentences:\n"${prompt}"`,
    generate: `Generate a response based on this prompt:\n"${prompt}"`,
    expand: `Expand this text into a detailed paragraph:\n"${prompt}"`
  };

  const finalPrompt = prompts[task] || prompts.generate;

  const result = await model.generateContent(finalPrompt);
  const textResponse = result.response.text().trim();
  const cleanedResponse = cleanMarkdown(textResponse);

  if (task === 'word_suggestions') {
    try {
      return { suggestions: JSON.parse(cleanedResponse) };
    } catch {
      return { suggestions: cleanedResponse.split('\n').map((s) => s.trim()) };
    }
  }
  return { response: cleanedResponse };
};

let dbReady = false;

const initDatabase = async () => {
  if (dbReady) return;
  await connectDB();
  await sequelize.sync();
  dbReady = true;
  console.log('✅ Database tables synced');
};

app.use(async (_req, _res, next) => {
  try {
    await initDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/', (_, res) => {
  res.json({ message: '🚀 Welcome to NoteFlow API! Your server is up and running.' });
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok', database: 'postgresql' });
});

app.use('/api', require('./routes/noteRoutes'));
app.use('/api', require('./routes/connectionRoutes'));

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('ai-process', async ({ task, prompt }) => {
    try {
      const result = await formatResponse(task, prompt);
      socket.emit('ai-response', { success: true, task, prompt, result });
    } catch (error) {
      socket.emit('ai-response', { success: false, error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

app.use((_, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

const startServer = async () => {
  try {
    await initDatabase();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📦 Database: PostgreSQL (${DATABASE_URL?.split('@')[1] || 'configured'})`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

if (process.env.VERCEL) {
  module.exports = app;
} else {
  startServer();
}