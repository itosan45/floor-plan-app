import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';

const app = express();
const port = process.env.PORT || 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requestLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(requestLimiter);

// Serve only production build assets.
app.use(express.static(path.join(__dirname, 'dist')));

// For a Single Page Application (SPA), all other routes should also serve index.html
// to let the client-side router handle them.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
