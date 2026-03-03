import express, { Application, Request, Response } from 'express';
import cors from 'cors';

const app: Application = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Configure CORS
// You can specify more granular options based on your security requirements.
// For example, to allow requests only from 'http://localhost:4200':
// app.use(cors({ origin: 'http://localhost:4200' }));
// For development, allowing all origins is common but less secure in production:
app.use(cors());

// Basic route for testing server status
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Express server is running and CORS is configured!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
