/**
 * @module IpfsWikiNode
 * @description Provides an interface for users to interact with IpfsWikiNode.
 */
import { IpfsWikiNodeP2P } from "./ipfs-wiki-node.js";
import type { Blockstore } from "interface-blockstore";
import type { Datastore } from "interface-datastore";

/**
 * Options used to create a IpfsWikiNode.
 */
export interface IpfsWikiNodeInit {
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
   * The public ip of the node
   */
  publicIP?: string;

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
}

/**
 * Creates an instance of IpfsWikiNode.
 *
 * By default the node will connect to the Bitxenia wiki, which name is "bitxenia-wiki", except another name is passed by parameter
 *
 * The node is started by default.
 *
 * @function createIpfsWikiNode
 * @param {IpfsWikiNodeInit} init Options used to create a IpfsWikiNode
 * @instance
 */
export async function createIpfsWikiNode(
  init: IpfsWikiNodeInit = {}
): Promise<IpfsWikiNodeP2P> {
  const node = new IpfsWikiNodeP2P(init);
  await node.start();
  return node;
}

/**
 * The API presented by a IpfsWikiNode node
 */
export interface IpfsWikiNode {
  /**
   * Starts the IpfsWikiNode node
   */
  start(): Promise<void>;

  /**
   * Gets an existing article
   */
  getArticle(
    articleName: string,
    articleVersionID?: string
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

  /**
   * Stops the IpfsWikiNode node
   */
  stop(): Promise<void>;
}

export type VersionInfo = {
  id: string;
  date: string;
  parent: string | null;
  mainBranch: boolean;
};

export type ArticleInfo = {
  name: string;
  content: string;
  versionsInfo: VersionInfo[];
};
