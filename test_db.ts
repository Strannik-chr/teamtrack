import { db } from "./src/pkg/firebase/admin.js";
db.collection("competitions").where("source_id", "==", "mock").get()
  .then(s => console.log("Success", s.empty))
  .catch(e => console.error("Error", e.message));
