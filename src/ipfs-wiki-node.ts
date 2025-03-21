import { IpfsWikiNodeInit } from "./index.ts";
import { startOrbitDb } from "./utils/startOrbitdb.ts";
import { ArticleRepository } from "./articleRepository.ts";
import { IpfsWikiNode } from "./index.ts";

export class IpfsWikiNodeP2P implements IpfsWikiNode {
  wikiName: string;
  publicIP: string;
  articleRepository: ArticleRepository;

  constructor(init: IpfsWikiNodeInit) {
    this.wikiName = init.wikiName ?? "bitxenia-wiki";
    this.publicIP = init.publicIP ?? "0.0.0.0";
  }

  public async start(): Promise<void> {
    const orbitdb = await startOrbitDb(this.publicIP);

    console.log("Peer multiaddrs:");
    let multiaddrs = orbitdb.ipfs.libp2p.getMultiaddrs();
    for (const ma of multiaddrs) {
      console.log(`${ma}`);
    }

    // TODO: Move & handle this in a separate place.
    // Log the peer's multiaddrs whenever they change
    let oldAddrs = new Map();
    orbitdb.ipfs.libp2p.addEventListener("self:peer:update", (evt) => {
      const newAddrs = orbitdb.ipfs.libp2p.getMultiaddrs();
      if (JSON.stringify(oldAddrs) !== JSON.stringify(newAddrs)) {
        console.log("Peer multiaddrs changed:");
        for (const ma of newAddrs) {
          console.log(`${ma}`);
        }
        oldAddrs = newAddrs;
      }
    });
    this.articleRepository = new ArticleRepository(orbitdb, this.wikiName);
    await this.articleRepository.init();
  }

  public async getArticle(articleName: string): Promise<void> {}

  public async newArticle(articleName: string): Promise<void> {}

  public async editArticle(): Promise<void> {}

  public async getArticleList(): Promise<void> {}

  public async stop(): Promise<void> {
    // TODO: Implement
  }
}
