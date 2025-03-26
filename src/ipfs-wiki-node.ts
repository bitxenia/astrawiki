import { ArticleInfo, IpfsWikiNodeInit } from "./index.ts";
import { startOrbitDb } from "./utils/startOrbitdb.ts";
import { ArticleRepository } from "./articleRepository.ts";
import { IpfsWikiNode } from "./index.ts";

export class IpfsWikiNodeP2P implements IpfsWikiNode {
  nodeConfig: IpfsWikiNodeInit;
  articleRepository: ArticleRepository;

  constructor(init: IpfsWikiNodeInit) {
    this.nodeConfig = init;
  }

  public async start(): Promise<void> {
    const orbitdb = await startOrbitDb(this.nodeConfig.publicIP);

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
    this.articleRepository = new ArticleRepository(
      orbitdb,
      this.nodeConfig.wikiName,
      this.nodeConfig.isCollaborator
    );
    await this.articleRepository.init();
  }

  public async getArticle(
    articleName: string,
    articleVersionID?: string
  ): Promise<ArticleInfo> {
    console.log(`Fetching article ${articleName}`);
    const article = await this.articleRepository.getArticle(
      articleName,
      articleVersionID
    );
    console.log(`Article ${articleName} fetched`);
    return article;
  }

  public async newArticle(
    articleName: string,
    articleContent: string
  ): Promise<void> {
    await this.articleRepository.newArticle(articleName, articleContent);
  }

  public async editArticle(
    articleName: string,
    newArticleContent: string
  ): Promise<void> {
    await this.articleRepository.editArticle(articleName, newArticleContent);
  }

  public async getArticleList(): Promise<string[]> {
    return await this.articleRepository.getArticleList();
  }

  public async stop(): Promise<void> {
    // TODO: Implement
  }
}
