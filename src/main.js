import { startOrbitDb } from "./utils/start_orbitdb.js";
import { startArticleDb } from "./utils/start_article_db.js";

const main = async () => {
  const orbitdb = await startOrbitDb();
  const articleDb = await startArticleDb(orbitdb);
};

main();
