import { db } from "./src/pkg/firebase/admin.js";
db.collection("projects").limit(1).get()
  .then(s => console.log("Projects Success", s.empty))
  .catch(e => console.error("Projects Error", e.message));
