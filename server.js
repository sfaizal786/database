import express from "express";
import multer from "multer";
import path from "path";
import csv from "csv-parser";
import fs from "fs";
import { fileURLToPath } from "url";

import { connectMongo } from "./mongodb/mongoconnect.js";
import { ValidatedEmail } from "./mongodb/model/validemail.js";

const app = express();
const Port = 8000;

// ===== Fix __dirname in ES Modules =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Static folder =====
app.use(express.static("public"));

// ===== Multer Upload =====
const upload = multer({ dest: "./uploads" });

// ===== Connect MongoDB =====
await connectMongo();


// =====================================================
// HOME ROUTE
// =====================================================
app.get("/", (req, res) => {
  res.send("META_INSYT Email Database Server Running 🚀");
});


// =====================================================
// 📤 UPLOAD CSV ROUTE
// =====================================================
app.post("/upload", upload.single("emailList"), (req, res) => {

  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const oldpath = req.file.path;

  let totalRows = 0;
  let created = 0;
  let duplicates = 0;

  fs.createReadStream(oldpath)
    .pipe(csv())
    .on("data", async function (row) {

      this.pause();

      totalRows++;

      try {

        const email = Object.values(row)[0]?.trim();
        const name = Object.values(row)[1]?.trim() || "";

        // ✅ Skip invalid rows
        if (!email || !email.includes("@")) {
          this.resume();
          return;
        }

        // ✅ Extract domain (REQUIRED FIELD)
        const domain = email.split("@")[1].toLowerCase();

        await ValidatedEmail.create({
          email,
          name,
          domain,
          status: true,
          smtpCode: 250,
          validatedAt: new Date()
        });

        console.log("Created:", email);
        created++;

      } catch (err) {

        if (err.code === 11000) {
          console.log("Duplicate skipped:", Object.values(row)[0]);
          duplicates++;
        } else {
          console.error("Mongo error:", err.message);
        }
      }

      this.resume();
    })
    .on("end", async () => {

      // rename uploaded file
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
    .on("error", (err) => {
      console.error(err);
      res.status(500).send("CSV processing failed");
    });
});


// =====================================================
// 📥 DOWNLOAD FULL DATABASE
// =====================================================
app.get("/download-all", async (req, res) => {

  try {

    const emails = await ValidatedEmail.find({ status: true }).lean();

    if (!emails.length) {
      return res.status(404).send("No emails found");
    }

    const filePath = path.join("./uploads", `all_emails_${Date.now()}.csv`);

    const writeStream = fs.createWriteStream(filePath);

    writeStream.write("Email,Name,Domain,Status,SmtpCode,ValidatedAt\n");

    emails.forEach(e => {
      writeStream.write(
        `${e.email || ""},${e.name || ""},${e.domain || ""},${e.status},${e.smtpCode},${e.validatedAt}\n`
      );
    });

    writeStream.end();

    writeStream.on("finish", () => {
      res.download(filePath, () => {
        fs.unlink(filePath, () => {});
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Download failed");
  }
});


// =====================================================
// 📥 DOWNLOAD BY DOMAIN (FAST VERSION)
// =====================================================
app.get("/download-domain", async (req, res) => {

  try {

    const domain = req.query.domain;

    if (!domain) {
      return res.status(400).send("Domain required");
    }

    // ✅ FAST INDEXED QUERY
    const emails = await ValidatedEmail.find({
      domain: domain.toLowerCase(),
      status: true
    }).lean();

    if (!emails.length) {
      return res.status(404).send("No emails found for this domain");
    }

    const filePath = path.join("./uploads", `domain_${domain}_${Date.now()}.csv`);

    const writeStream = fs.createWriteStream(filePath);

    writeStream.write("Email,Name,Domain,Status,SmtpCode,ValidatedAt\n");

    emails.forEach(e => {
      writeStream.write(
        `${e.email || ""},${e.name || ""},${e.domain || ""},${e.status},${e.smtpCode},${e.validatedAt}\n`
      );
    });

    writeStream.end();

    writeStream.on("finish", () => {
      res.download(filePath, () => {
        fs.unlink(filePath, () => {});
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Domain download failed");
  }
});

// =====================================================
// 📥 Delete invalid emails
// =====================================================
app.post("/remove-invalid-csv", upload.single("emailList"), async (req,res)=>{

  const filePath = req.file.path;
  const emails=[];

  fs.createReadStream(filePath)
  .pipe(csv())
  .on("data",(row)=>{
      const email=row.email?.trim() || Object.values(row)[0]?.trim();
      if(email) emails.push(email.toLowerCase());
  })
  .on("end",async ()=>{

      const result=await ValidatedEmail.deleteMany({
          email:{ $in: emails }
      });

      fs.unlink(filePath,()=>{});

      res.json({ deletedCount: result.deletedCount });
  });
});

// =====================================================
// START SERVER
// =====================================================
app.listen(Port, () => {
  console.log(`server running on port ${Port}`);
});
