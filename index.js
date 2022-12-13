const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3600;

// setup in memory db
let db = {};

// for db changes
let dbLock = false;
let unsavedChanges = false;

// read the db in from disk if it exists, else set it up
if (fs.existsSync("./db.json")) {
    db = JSON.parse(fs.readFileSync("./db.json"));
} else {
    db.songs = [];
    db.id = 0;
}

// db lock to avoid update issues
function dbGetLock() {
    if (dbLock == true) {
        setTimeout(module.exports.dbGetLock(), 100);
    } else {
        dbLock = true;
    }
}

// unlock db
function dbUnlock() {
    if (dbLock == true) {
        dbLock = false;
    }
}

// sync db to file on disk
function dbSave() {
    if (unsavedChanges == false) {
        unsavedChanges = true;
        dbGetLock();
        let dbData = JSON.stringify(db, null);
        fs.writeFileSync("db.json", dbData);
        dbUnlock();
        unsavedChanges = false;
    }
}

// 60 minute sync timer
let dbSync = setInterval(dbSave, 60 * 60 * 1000);

// set cors to allow all origins
app.use(
    cors({
        origin: "*",
    })
);
app.set("trust proxy", true);

// Configuring body parser middleware
app.use(bodyParser.json());

// grab song list
app.get("/songs", (req, res) => {
    res.json(db.songs);
});

// add new song
app.post("/song", (req, res) => {
    if (!req.body.name || !req.body.artist || !req.body.yt) {
        return res.status(400).send({
            message: 'Malformed Request'
        });
    }
    let temp = {
        id: db.id,
        name: req.body.name,
        artist: req.body.artist,
        yt: req.body.yt,
        spotify: req.body.spotify,
        apple: req.body.apple,
        votes: 1,
    };
    db.songs.push(temp);
    db.id++;
    res.json(temp.id);
});

// vote for song
app.put('/vote', (req, res) => {
    if (!req.body.id) {
        return res.status(400).send({
            message: 'Malformed Request'
        });
    }
    let song = db.songs.findIndex((element) => {
        return element.id == req.body.id;
    });
    if (song != -1) {
        dbGetLock();
        db.songs[song].votes++;
        dbUnlock()
        return res.json('Song voted for!');
    } else {
        return res.status(400).send({
            message: 'Specified song does not exist.'
        });
    }
});

app.listen(port, () => console.log(`earworm API listening on port ${port}!`));

// save db to disk on shutdown
const gracefulShutdown = () => {
    dbSave();
    process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);