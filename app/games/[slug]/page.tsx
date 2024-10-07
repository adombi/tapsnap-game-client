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
    keepAlive: 60000,
    lifetime: 600000,
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
  LOBBY = 'lobby',
  COUNT_DOWN = 'count_down',
  IN_PROGRESS = 'in_progress'
}

export default function Page({ params }: { params: { slug: string } }) {
  const gameId: string = params.slug
  const { player } = usePlayer();
  const [requester, setRequester] = useState<OnTerminalSubscriber & OnNextSubscriber & OnExtensionSubscriber & Requestable & Cancellable>();
  const [connected, setConnected] = useState<boolean>(false)
  const [phase, setPhase] = useState<Phase>(Phase.LOBBY);
  const [game, setGame] = useState<Game>();
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

    if (!ignore && !connected) {
      const connectRsocket = async () => {
        const rsocket = await connector.connect()
        setRequester(rsocket.requestChannel(
          {
            data: Buffer.from(new CloudEvent<undefined>({
              id: crypto.randomUUID(),
              source: "https://snaptap.adombi.dev",
              type: "com.creative_it.meetup_game_server.Connect"
            }).toString()),
            metadata: createRoute(`tap-snap/${gameId}`)
          },
          9999,
          false,
          {
            onError: (e) => {
              console.error(e);
            },
            onNext: (payload, isComplete) => {
              const cloudEvent: CloudEvent<any> = JSON.parse(payload.data?.toString()!!)
              switch (cloudEvent.type) {
                case "Joined":
                  setGame(cloudEvent.data)
              }
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
            },
            cancel: () => {
              console.warn('Canceled!');
            },
          }
        ))
      }
      connectRsocket()
        .then(() => setConnected(true))
        .catch(console.error)
    }

    return () => {
      ignore = true
      requester?.cancel()
    }
  }, [])

  useEffect(() => {
    if (connected && player) {
      console.log("JoinRequest")
      requester!.onNext({
        data: Buffer.from(new CloudEvent<JoinRequest>({
          id: crypto.randomUUID(),
          source: "https://snaptap.adombi.dev",
          type: "com.creative_it.meetup_game_server.JoinRequest",
          data: {
            "playerName": player
          }
        }).toString()),
        metadata: createRoute(`tap-snap/${gameId}`)
      }, false)
    }
  }, [connected, player]);

  if (player === undefined) return <NameModal/>
  if (requester === undefined || game === undefined) return <div>Loading game...</div>

  const cloudEvent = new CloudEvent<User>({
    id: crypto.randomUUID(),
    source: "https://snaptap.adombi.dev",
    type: "com.creative_it.meetup_game_server.StartGame"
  });
  switch (phase) {
    case Phase.LOBBY:
      return <div>
          <h1>{gameId} Lobby</h1>
          <p>Waiting for other players to join</p>
            {game.users.map((user: User) => (
              <ul key={user.name}>
                <li>{user.name}</li>
              </ul>
            ))}
        </div>
  }
  return <>
      <p>Game: {gameId} - {phase}</p>
      <p>Player: {player}</p>
      <button
        type="button"
        className='h-8 px-2 text-md rounded-md bg-gray-700 text-white'
        onClick={() => requester.onNext({
          data: Buffer.from(cloudEvent.toString()),
          metadata: createRoute(`tap-snap/${gameId}`)
        }, false)}
      >
        Start
      </button>
    </>
}