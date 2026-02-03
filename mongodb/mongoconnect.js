import mongoose from "mongoose";
//  username: "Meta_insyt"
//  password: "admaruk@786"

export async function connectMongo() {
  try {
 await mongoose.connect(
  "mongodb+srv://Meta_insyt:admaruk%40786@meta.j4wkcgz.mongodb.net/?appName=meta",
  {
    dbName: "email_validator",
    autoIndex: true
  }
);


    console.log("✅ MongoDB Atlas connected");
  } catch (err) {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  }
}
