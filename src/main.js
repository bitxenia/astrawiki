import { initOrbitDB } from "./init_orbitdb.js";

const main = async () => {
  const { orbitdb, helia, db } = await initOrbitDB();
};

main();
