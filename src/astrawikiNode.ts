import {
  ArticleInfo,
  AstrawikiNodeInit as AstrawikiNodeInit,
} from "./index.js";
import { startOrbitDb } from "./utils/startOrbitdb.js";
import { ArticleRepository } from "./articleRepository.js";
import { AstrawikiNode as AstrawikiNode } from "./index.js";
import { MemoryBlockstore } from "blockstore-core";
import { MemoryDatastore } from "datastore-core";
import type { Blockstore } from "interface-blockstore";
import type { Datastore } from "interface-datastore";

export class AstrawikiNodeP2P implements AstrawikiNode {
  wikiName: string;
  publicIP: string;
  isCollaborator: boolean;
  articleRepository: ArticleRepository;
  datastore: Datastore;
  blockstore: Blockstore;

  constructor(init: AstrawikiNodeInit) {
    this.wikiName = init.wikiName ?? "bitxenia-wiki";
    this.publicIP = init.publicIP ?? "0.0.0.0";
    this.isCollaborator = init.isCollaborator ?? false;
    this.datastore = init.datastore ?? new MemoryDatastore();
    this.blockstore = init.blockstore ?? new MemoryBlockstore();

    if (this.isCollaborator) {
      if (!this.datastore || !this.blockstore) {
        throw new Error(
          "A collaborator node should use a persistent datastore and blockstore."
        );
      }
    }
  }

  public async start(): Promise<void> {
    const orbitdb = await startOrbitDb(
      this.publicIP,
      this.datastore,
      this.blockstore
    );

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
      this.wikiName,
      this.isCollaborator
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
