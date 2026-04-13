const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Serve all static files from the root directory.
// This will serve index.html for the root path.
app.use(express.static(path.join(__dirname, '.')));

// For a Single Page Application (SPA), all other routes should also serve index.html
// to let the client-side router handle them.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
