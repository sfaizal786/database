import express from 'express';
import multer from 'multer';
import path from 'path';
import csv from 'csv-parser';
import fs from 'fs';
import { connectMongo } from './mongodb/mongoconnect.js';
import { ValidatedEmail } from './mongodb/model/validemail.js';

const app = express();
const Port = 8000;

app.use(express.static('public'));

// multer upload folder
const upload = multer({ dest: './uploads' });

// connect MongoDB Atlas
await connectMongo();

app.get('/', (req, res) => {
  res.send('hello world');
});

app.post('/upload', upload.single('emailList'), (req, res) => {

  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const oldpath = req.file.path;

  let totalRows = 0;
  let created = 0;
  let duplicates = 0;

  fs.createReadStream(oldpath)
    .pipe(csv())
    .on('data', async function (row) {

      this.pause(); // pause stream while inserting

      totalRows++;

      try {
        // ✅ Works even if CSV header has hidden characters
        const email = Object.values(row)[0]?.trim();

        if (!email) {
          this.resume();
          return;
        }

        // ✅ Create new email
        await ValidatedEmail.create({
          email,
          status: true,
          smtpCode: 250,
          validatedAt: new Date()
        });

        console.log("Created:", email);
        created++;

      } catch (err) {

        // ✅ Duplicate email → skip & continue
        if (err.code === 11000) {
          console.log("Duplicate skipped:", Object.values(row)[0]);
          duplicates++;
        } else {
          console.error("Mongo error:", err.message);
        }
      }

      this.resume();
    })
    .on('end', async () => {

      // rename uploaded file to original name
      const newpath = path.join(
        path.dirname(oldpath),
        req.file.originalname
      );

      await fs.promises.rename(oldpath, newpath);

      res.json({
        message: "CSV processed successfully",
        totalRows,
        created,
        duplicates
      });
    })
    .on('error', (err) => {
      console.error(err);
      res.status(500).send('CSV processing failed');
    });

});

app.listen(Port, () => {
  console.log(`server running on port ${Port}`);
});
