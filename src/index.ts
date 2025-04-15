/**
 * @module Astrawiki
 * @description Provides an interface for users to interact with Astrawiki.
 */
import { AstrawikiNodeP2P } from "./astrawikiNode.js";
import type { Blockstore } from "interface-blockstore";
import type { Datastore } from "interface-datastore";
import { MemoryBlockstore } from "blockstore-core";
import { MemoryDatastore } from "datastore-core";

/**
 * Options used to create an AstrawikiNode.
 */
export interface AstrawikiNodeInit {
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
  publicIP?: string;
}

/**
 * Creates an instance of AstrawikiNode.
 *
 * By default the node will connect to the Bitxenia wiki, which name is "bitxenia-wiki", except another name is passed by parameter
 *
 * The node is started by default.
 *
 * @function createAstrawikiNode
 * @param {AstrawikiNodeInit} init Options used to create an AstrawikiNode
 * @instance
 */
export async function createAstrawikiNode(
  init: AstrawikiNodeInit = {},
): Promise<AstrawikiNodeP2P> {
  // Set default values for the parameters if not provided
  const wikiname = init.wikiName ?? "bitxenia-wiki";
  const isCollaborator = init.isCollaborator ?? false;
  const datastore = init.datastore ?? new MemoryDatastore();
  const blockstore = init.blockstore ?? new MemoryBlockstore();
  const publicIP = init.publicIP ?? "0.0.0.0";

  const node = new AstrawikiNodeP2P();
  await node.start(wikiname, isCollaborator, datastore, blockstore, publicIP);
  return node;
}

/**
 * The API presented by an AstrawikiNode
 */
export interface AstrawikiNode {
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
