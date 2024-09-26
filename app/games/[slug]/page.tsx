import {RSocketConnector} from "rsocket-core";
import {WebsocketClientTransport} from "rsocket-websocket-client";
import MESSAGE_RSOCKET_ROUTING = WellKnownMimeType.MESSAGE_RSOCKET_ROUTING;
import {encodeCompositeMetadata, encodeRoute, WellKnownMimeType} from "rsocket-composite-metadata";

const connector = new RSocketConnector({
  setup: {
    // keepAlive: 10000,
    // lifetime: 100000,
    dataMimeType: "application/json",
    metadataMimeType: "message/x.rsocket.composite-metadata.v0"
  },
  transport: new WebsocketClientTransport({
    url: "ws://localhost:7000",
    wsCreator: (url) => new WebSocket(url),
    debug: true,
  }),
});

export default async function Page({ params }: { params: { slug: string } }) {
  function createRoute(route?: string) {
    let compositeMetaData = undefined;
    if (route) {
      const encodedRoute = encodeRoute(route);

      const map = new Map<WellKnownMimeType, Buffer>();
      map.set(MESSAGE_RSOCKET_ROUTING, encodedRoute);
      compositeMetaData = encodeCompositeMetadata(map);
    }
    return compositeMetaData;
  }
  // debugger;

  const rsocket = await connector.connect();

  const requester = rsocket.requestChannel(
    {
      data: Buffer.from(JSON.stringify({ 'name': 'example', 'takeUntil': 2})),
      metadata: createRoute('sensor-gaming/real-game')
    },
    10,
    false,
    {
      onError: (e) => {
        console.error(e);
      },
      onNext: (payload, isComplete) => {
        console.log(
          `payload[data: ${payload.data}; metadata: ${payload.metadata}]|${isComplete}`
        );
      },
      onComplete: () => {
        console.log('Completed!');
      },
      onExtension: () => { },
      request: (n) => {
        console.log(`request(${n})`);
        // requester.onNext(
        //   {
        //     data: Buffer.from("Message"),
        //   },
        //   true
        // );
      },
      cancel: () => {
        console.warn('Canceled!');},
    }
  );

  return <p>Post: {params.slug}</p>
}