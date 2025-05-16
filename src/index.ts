/**
 * @module Astrawiki
 * @description Provides an interface for users to interact with Astrawiki.
 */
import { AstrawikiNode } from "./astrawiki";
import type { Blockstore } from "interface-blockstore";
import type { Datastore } from "interface-datastore";
import { MemoryBlockstore } from "blockstore-core";
import { MemoryDatastore } from "datastore-core";

/**
 * Options used to create an Astrawiki.
 */
export interface AstrawikiInit {
  /**
   * Wiki name is the wiki which the node connects to.
   * By default the node will connect to the Bitxenia wiki, which name is "bitxenia-wiki".
   */
  wikiName?: string;

  /**
   * A collaborator is a node which helps with the availability and persistence of the wiki.
   * This means that the collaborator will replicate all the wiki's data, using its own local storage.
   * Web browsers are not good candidates for collaborators, since they are not always online.
   * Only collaborator nodes can create a new wiki. If a node is not a collaborator, it can only connect to an existing wiki.
   * By default the node is not a collaborator.
   */
  isCollaborator?: boolean;

  /**
   * The datastore used by the node.
   * By default the node will use a MemoryDatastore, which is a memory-based datastore.
   * If you want to use a persistent datastore, you can pass a different datastore.
   * For browser environments, you can use the LevelDatastore.
   * For node environments, you can use the FsDatastore.
   *
   * A collaborator node should use a persistent datastore, since it will replicate the wiki's data.
   * It will fail to start if the datastore is not persistent.
   */
  datastore?: Datastore;

  /**
   * The blockstore used by the node.
   * By default the node will use a MemoryBlockstore, which is a memory-based blockstore.
   * If you want to use a persistent blockstore, you can pass a different blockstore.
   * For browser environments, you can use the LevelBlockstore.
   * For node environments, you can use the FsBlockstore.
   *
   * A collaborator node should use a persistent blockstore, since it will replicate the wiki's data.
   * It will fail to start if the blockstore is not persistent.
   */
  blockstore?: Blockstore;

  /**
   * The public ip of the node
   */
  publicIp?: string;

  /**
   * The tcp port of the node. If astrawiki is running in a browser, this will be ignored.
   *
   * It is a TCP port.
   *
   * @default 40001
   */
  tcpPort?: number;

  /**
   * The WebRTC direct port of the node. If astrawiki is running in a browser, this will be ignored.
   *
   * It is a UDP port.
   *
   * @default 40001
   */
  webRTCDirectPort?: number;

  /**
   * Data directory. This is the directory where all the astrawiki data will be stored,
   * it is recommended to use the same directory as the datastore and blockstore.
   *
   * Different nodes should use different directories.
   *
   * @default "./data/astrawiki"
   *
   * @example
   * ```typescript
   * const datastore = new FsDatastore("./data/node1/datastore");
   * const blockstore = new FsBlockstore("./data/node1/blockstore");
   * const astraDb = await createAstrawiki({
   *  datastore: datastore,
   *  blockstore: blockstore,
   *  dataDir: "./data/node1",
   * });
   */
  dataDir?: string;

  /**
   * List of bootstrap provider peers to connect to. This is useful if there are known peers using the same astrawiki network
   * and you want to connect to them directly, instead of waiting for the discovery process.
   *
   * The list contains the multiaddresses of the peers.
   *
   * For example, if the peer multiaddress is a tcp address, it should be in the format:
   * `/ip4/<ip>/tcp/<port>/p2p/<peerId>`.
   *
   * @default []
   */
  bootstrapProviderPeers?: string[];

  /**
   * If true, the node will not connect to the astrawiki network and will only work locally.

   * This is useful for testing purposes.
   *
   * @default false
   */
  offlineMode?: boolean;
}

/**
 * Creates an instance of Astrawiki.
 *
 * By default the node will connect to the Bitxenia wiki, which name is "bitxenia-wiki", except another name is passed by parameter
 *
 * The node is started by default.
 *
 * @function createAstrawiki
 * @param {AstrawikiInit} init Options used to create an Astrawiki
 * @instance
 */
export async function createAstrawiki(
  init: AstrawikiInit = {},
): Promise<AstrawikiNode> {
  // Set default values for the parameters if not provided
  init.wikiName = init.wikiName ?? "bitxenia-wiki";
  init.isCollaborator = init.isCollaborator ?? false;
  init.datastore = init.datastore ?? new MemoryDatastore();
  init.blockstore = init.blockstore ?? new MemoryBlockstore();
  init.publicIp = init.publicIp ?? "0.0.0.0";
  init.tcpPort = init.tcpPort ?? 40001;
  init.webRTCDirectPort = init.webRTCDirectPort ?? 40001;
  init.dataDir = init.dataDir ?? "./data/astrawiki";
  init.bootstrapProviderPeers = init.bootstrapProviderPeers ?? [];
  init.offlineMode = init.offlineMode ?? false;

  const node = new AstrawikiNode(init.wikiName);
  await node.init(init);
  return node;
}

/**
 * The API presented by an Astrawiki
 */
export interface Astrawiki {
  /**
   * Gets an existing article
   */
  getArticle(
    articleName: string,
    articleVersionID?: string,
  ): Promise<ArticleInfo>;

  /**
   * Creates a new article
   */
  newArticle(articleName: string, articleContent: string): Promise<void>;

  /**
   * Edits an existing article
   */
  editArticle(articleName: string, newArticleContent: string): Promise<void>;

  /**
   * Gets the list of articles in the wiki
   */
  getArticleList(): Promise<string[]>;
}

export type ArticleInfo = {
  name: string;
  content: string;
  versionsInfo: VersionInfo[];
};

export type VersionInfo = {
  id: string;
  date: string;
  parent: string | null;
  mainBranch: boolean;
};
