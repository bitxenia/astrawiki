import { HeliaLibp2p } from "helia";
import { CID } from "multiformats/cid";
import { PeerId } from "@libp2p/interface";

const ASTRAWIKI_PROTOCOL = "/ipfs/astrawiki";

export class ConnectionManager {
  private ipfs: HeliaLibp2p;
  private providerCID: CID;

  constructor(ipfs: HeliaLibp2p) {
    this.ipfs = ipfs;
  }

  public async init(providerCID: CID, isCollaborator: boolean) {
    this.providerCID = providerCID;

    // Add astrawiki protocol to the libp2p node.
    this.ipfs.libp2p.handle(ASTRAWIKI_PROTOCOL, ({ stream }) => {
      console.log("Received connection from astrawiki peer");
    });

    this.startService(async () => {
      await this.connectToProviders();
    });

    // We only want to provide the database if we are a collaborator.
    if (isCollaborator) {
      this.startService(async () => {
        await this.provideDB();
      });
    }

    this.setupEvents();
  }

  private async connectToProviders(): Promise<void> {
    // TODO: Check if we need to add a timeout.
    try {
      let providers = this.ipfs.libp2p.contentRouting.findProviders(
        this.providerCID
      );
      for await (const provider of providers) {
        try {
          // Check if the provider is us.
          if (provider.id === this.ipfs.libp2p.peerId) {
            console.log("Provider is us, skipping...");
            continue;
          }
          // Check if we are already connected.
          if (this.ipfs.libp2p.peerStore.has(provider.id)) {
            console.log(`Already connected to provider: ${provider.id}`);
            continue;
          }

          console.log(`Connecting to provider: ${provider.id}`);
          await this.ipfs.libp2p.dial(provider.id);
        } catch (error) {
          console.error(
            `Error connecting to provider ${provider.id}: ${error}`
          );
        }
      }
    } catch (error) {
      console.error("Error finding providers:", error);
    }
  }

  private async provideDB() {
    // TODO: See if we need to reprovide or if it is done automatically with helia/libp2p.
    // TODO: See if we need to also provide the "file", we could be getting "banned" from the network.
    // TODO: See if only colaborators should provide the database.
    const cid = this.providerCID;
    try {
      console.log("Providing database address...");
      const startTime = performance.now();
      await this.ipfs.routing.provide(cid);
      const endTime = performance.now();

      console.log(
        `Database address provided, took ${
          (endTime - startTime) / 1000
        } seconds`
      );
    } catch (error) {
      console.error("Error providing database:", error);
    }
  }

  private setupEvents() {
    this.ipfs.libp2p.addEventListener("peer:connect", (evt) => {
      const peerId = evt.detail;
      this.manageNewConnection(peerId);
    });
  }

  private async manageNewConnection(peerId: PeerId) {
    const peerInfo = await this.ipfs.libp2p.peerStore.get(peerId);

    // See if the peer is not an Astrawiki peer.
    if (!peerInfo.protocols.includes(ASTRAWIKI_PROTOCOL)) {
      return;
    }
    console.log(`Connected to astrawiki peer: ${peerId}`);

    // Tag the peer with a high priority to make sure we are connected to it.
    await this.ipfs.libp2p.peerStore.merge(peerId, {
      tags: {
        "my-tag": {
          value: 100, // 0-100 is the typical value range
        },
      },
    });
  }

  private async startService(serviceFunction: () => Promise<void>) {
    // TODO: Find a better way to handle the service function. it should be stoppable.
    while (true) {
      try {
        await serviceFunction();
      } catch (error) {
        console.error("Error in service function:", error);
      }
      // Wait 10 seconds before running the service function again
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}
