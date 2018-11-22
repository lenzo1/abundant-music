/* eslint-disable no-console*/
const express = require('express');
const opn = require('opn');

const app = express();
const port = 3000;

app.use('/js', express.static(__dirname + '/js'));
app.use('/tutorials', express.static(__dirname + '/tutorials'));
app.use('/songpresets', express.static(__dirname + '/songpresets'));
app.use('/help', express.static(__dirname + '/help'));
app.use('/css', express.static(__dirname + '/css'));

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
    opn(`http://localhost:${port}`);
});