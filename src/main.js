import { startOrbitDB } from "./utils/start_orbitdb.js";

const main = async () => {
  const { orbitdb, helia, db } = await startOrbitDB();

  db.events.on("update", async (entry) => {
    console.log("Database updated:", entry.payload.value);

    let { articleName, articleAddress } = record.payload.value.split("::");

    // Replicate the article
    const db = await orbitdb.open(articleAddress);
    console.log(`database opened: ${db.address}`);
  });
};

main();
