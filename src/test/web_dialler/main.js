import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { autoNAT } from "@libp2p/autonat";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { dcutr } from "@libp2p/dcutr";
import { identify, identifyPush } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import * as filters from "@libp2p/websockets/filters";
import { webTransport } from "@libp2p/webtransport";
import { multiaddr } from "@multiformats/multiaddr";
import { createLibp2p } from "libp2p";

let libp2p;

const init = async () => {
  libp2p = await createLibp2p({
    addresses: {
      listen: ["/p2p-circuit", "/webrtc"],
    },
    transports: [
      circuitRelayTransport(),
      webRTC(),
      webRTCDirect(),
      webTransport(),
      webSockets({
        filter: filters.all,
      }),
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      autoNAT: autoNAT(),
      dcutr: dcutr(),
      identify: identify(),
      ping: ping(),
    },
  });
  console.log(`Node started with id ${libp2p.peerId.toString()}`);

  libp2p.addEventListener("connection:open", (evt) => {
    console.log(evt);
  });
};

window.addEventListener("load", async (event) => {
  await init();
});

window.addEventListener("unload", async (event) => {
  await libp2p.stop();
});

document.getElementById("dialNode").addEventListener("click", async () => {
  const nodeAddress = document.getElementById("nodeAddress").value;

  console.log("Attempting to connect to the provider...");
  let addrs = [multiaddr(nodeAddress)];
  await libp2p.dial(addrs);
  console.log("Succefully connected");
});
