'use client';

import {RSocketConnector} from "rsocket-core";
import {WebsocketClientTransport} from "rsocket-websocket-client";
import MESSAGE_RSOCKET_ROUTING = WellKnownMimeType.MESSAGE_RSOCKET_ROUTING;
import {encodeCompositeMetadata, encodeRoute, WellKnownMimeType} from "rsocket-composite-metadata";
import React from "react";
import { CloudEvent } from "cloudevents";

const connector = new RSocketConnector({
  setup: {
    // keepAlive: 10000,
    // lifetime: 100000,
    dataMimeType: "application/cloudevents+json",
    metadataMimeType: "message/x.rsocket.composite-metadata.v0"
  },
  transport: new WebsocketClientTransport({
    url: process.env.WEBSOCKET_SERVER_HOST || "ws://localhost:7000",
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
      data: Buffer.from(new CloudEvent<User>({ id: crypto.randomUUID(), source: "asdf", type: "java.lang.String", data: {"name": "player1"}}).toString()),
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

  const cloudEvent = new CloudEvent<User>({
    id: crypto.randomUUID(), source: "asdf", type: "java.lang.String", data: {"name": "Start"}
  });
  return <>
      <p>Game: {params.slug}</p>
      <button
        type="button"
        className='h-8 px-2 text-md rounded-md bg-gray-700 text-white'
        onClick={() => requester.onNext({
          data: Buffer.from(cloudEvent.toString()),
          metadata: createRoute('sensor-gaming/real-game')
        }, false)}
      >
        Start
      </button>
    </>
}