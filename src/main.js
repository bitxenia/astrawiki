import { startOrbitDB } from "./utils/start_orbitdb.js";

const main = async () => {
  const { orbitdb, helia, db } = await startOrbitDB();
};

main();
