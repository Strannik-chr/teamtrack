import { db } from "./src/pkg/firebase/admin.js";
db.collection("competitions").add({ test: 1 })
  .then(s => console.log("Add Success", s.id))
  .catch(e => console.error("Add Error", e.message));
