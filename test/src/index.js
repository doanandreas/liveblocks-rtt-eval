import { createClient, LiveObject } from "@liveblocks/client";

let peers = [];
let rttArray = [];
let readyPeer = 0;
let currTrials = 0;
let currRequest = {};
let currResponse = {};
let respondedPeers = new Set();

const connectToRoom = async (id, peerNumber, trialNumber, exportResult) => {
  const client = createClient({
    publicApiKey: "pk_live_uRo96jE67mE0Kw3lJdu0JhAH",
  });

  const room = client.enter("liveblocks-rtt-eval", {
    initialStorage: {
      status: new LiveObject(),
      request: new LiveObject(),
      response: new LiveObject(),
    },
  });

  const { root } = await room.getStorage();

  let status = root.get("status");
  let request = root.get("request");
  let response = root.get("response");

  room.subscribe(status, (st) => {
    for (const peerID in st.toObject()) {
      if (!peers.includes(peerID)) {
        readyPeer++;
        peers.push(peerID);
        console.log(`Peer ${peerID} is READY. Number of peers: ${readyPeer}`);

        if (readyPeer === peerNumber) {
          console.log("All peers are READY");
          request.set(id, new Date().getTime());
        }
      }
    }
  });

  room.subscribe(request, (rawReq) => {
    const req = rawReq.toObject();

    for (const peerID in req) {
      // Respond to other peers only
      if (peerID !== id) {
        // Liveblocks returns all state for all changes, only serve first new request
        const isNewRequest =
          !currRequest.hasOwnProperty(peerID) ||
          currRequest[peerID] !== req[peerID];

        if (isNewRequest) {
          currRequest[peerID] = req[peerID];
          response.set(`${id}->${peerID}`, new Date().getTime());
        }
      }
    }
  });

  room.subscribe(response, (rawRes) => {
    const res = rawRes.toObject();

    for (const resMapping in res) {
      const responder = resMapping.split("->")[0];
      const requester = resMapping.split("->")[1];

      if (requester === id) {
        const isNewResponse =
          !currResponse.hasOwnProperty(resMapping) ||
          currResponse[resMapping] !== res[resMapping];

        if (isNewResponse) {
          const rtt = new Date().getTime() - request.get(requester);
          currResponse[resMapping] = res[resMapping];

          rttArray.push([rtt]);
          respondedPeers.add(responder);

          if (respondedPeers.size === peerNumber - 1) {
            currTrials++;
            respondedPeers.clear();
            console.log(`${currTrials} out of ${trialNumber} trials done`);

            if (currTrials < trialNumber) {
              request.set(id, new Date().getTime());
            } else {
              console.log(`RTT results are complete.`);
              exportResult(rttArray);
            }
          }
        }
      }
    }
  });

  console.log(`My ID: ${id}`);
  status.set(id, "READY");
};

window.connectToRoom = connectToRoom;
