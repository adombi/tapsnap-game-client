'use client';

import {RSocketConnector} from "rsocket-core";
import {WebsocketClientTransport} from "rsocket-websocket-client";
import MESSAGE_RSOCKET_ROUTING = WellKnownMimeType.MESSAGE_RSOCKET_ROUTING;
import {encodeCompositeMetadata, encodeRoute, WellKnownMimeType} from "rsocket-composite-metadata";
import React, {useEffect, useState} from "react";
import { CloudEvent } from "cloudevents";
import {
  Cancellable,
  OnExtensionSubscriber,
  OnNextSubscriber,
  OnTerminalSubscriber, Requestable
} from "rsocket-core/dist/RSocket";
import usePlayer from "@/app/use-player";
import NameModal from "@/app/name-modal";

const connector = new RSocketConnector({
  setup: {
    // keepAlive: 10000,
    // lifetime: 100000,
    dataMimeType: "application/cloudevents+json",
    metadataMimeType: "message/x.rsocket.composite-metadata.v0"
  },
  transport: new WebsocketClientTransport({
    url: process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_HOST || "ws://localhost:7000",
    wsCreator: (url) => new WebSocket(url),
    debug: true,
  }),
});

enum Phase {
  WAITING = 'waiting',
  COUNT_DOWN = 'count_down',
  IN_PROGRESS = 'in_progress'
}

export default function Page({ params }: { params: { slug: string } }) {
  const { player } = usePlayer();
  const [requester, setRequester] = useState<OnTerminalSubscriber & OnNextSubscriber & OnExtensionSubscriber & Requestable & Cancellable>();
  const [phase, setPhase] = useState<Phase>(Phase.WAITING);
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

  useEffect(() => {
    let ignore = false

    if (!ignore && player) {
      const connectRsocket = async () => {
        return await connector.connect();
      }
      connectRsocket()
      .then(rsocket => rsocket.requestChannel(
        {
          data: Buffer.from(new CloudEvent<JoinRequest>({
            id: crypto.randomUUID(),
            source: "https://snaptap.adombi.dev",
            type: "com.creative_it.meetup_game_server.JoinRequest",
            data: {
              "playerName": player
            }
          }).toString()),
          metadata: createRoute(`sensor-gaming/${params.slug}`)
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
          onExtension: () => {
          },
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
            console.warn('Canceled!');
          },
        }
      ))
      .then(requester => setRequester(requester))
    }

    return () => {
      ignore = true
      requester?.cancel()
    }
  }, [player])

  if (player === undefined) {
    return (
      <NameModal/>
    )
  }

  const cloudEvent = new CloudEvent<User>({
    id: crypto.randomUUID(),
    source: "https://snaptap.adombi.dev",
    type: "com.creative_it.meetup_game_server.StartGame"
  });
  return <>
      <p>Game: {params.slug} - {phase}</p>
      <p>Player: {player}</p>
      <button
        type="button"
        className='h-8 px-2 text-md rounded-md bg-gray-700 text-white'
        onClick={() => requester?.onNext({
          data: Buffer.from(cloudEvent.toString()),
          metadata: createRoute('sensor-gaming/real-game')
        }, false)}
      >
        Start
      </button>
    </>
}