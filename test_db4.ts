import { db } from "./src/pkg/firebase/admin.js";
db.collection("projects").add({ test: 1 })
  .then(s => console.log("Projects Add Success", s.id))
  .catch(e => console.error("Projects Add Error", e.message));
