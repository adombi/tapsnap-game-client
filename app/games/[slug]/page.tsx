'use client';

import {RSocketConnector} from "rsocket-core";
import {WebsocketClientTransport} from "rsocket-websocket-client";
import MESSAGE_RSOCKET_ROUTING = WellKnownMimeType.MESSAGE_RSOCKET_ROUTING;
import {encodeCompositeMetadata, encodeRoute, WellKnownMimeType} from "rsocket-composite-metadata";
import React, {useEffect, useRef, useState} from "react";
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
  IN_PROGRESS = 'in_progress',
  RESULTS = 'results'
}

export default function Page({ params }: { params: { slug: string } }) {
  const gameId: string = params.slug
  const { player } = usePlayer();
  const [connected, setConnected] = useState<boolean>(false)
  const [phase, setPhase] = useState<Phase>(Phase.LOBBY);
  const [model, setModel] = useState<unknown>(undefined);
  const [game, setGame] = useState<Game>();
  const requester = useRef<OnTerminalSubscriber & OnNextSubscriber & OnExtensionSubscriber & Requestable & Cancellable>();
  const reacted = useRef(true)
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
        requester.current = rsocket.requestChannel(
          {
            data: Buffer.from(new CloudEvent<undefined>({
              id: crypto.randomUUID(),
              source: "https://snaptap.adombi.dev",
              type: "com.tapsnap.game_server.Connect"
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
              const cloudEvent: CloudEvent<unknown> = JSON.parse(payload.data?.toString() || '')
              switch (cloudEvent.type) {
                case "Joined":
                  setGame(cloudEvent.data as Game)
                  break;
                case "CountDown":
                  setPhase(Phase.COUNT_DOWN)
                  setModel(cloudEvent.data as number)
                  break;
                case "InProgress":
                  setPhase(Phase.IN_PROGRESS)
                  setModel({
                    number: cloudEvent.data as number,
                    eventReceivedEpoch: Date.now()
                  } as PhaseModel)
                  reacted.current = false
                  break;
                case "Results":
                  setPhase(Phase.RESULTS)
                  setModel(cloudEvent.data as Results)
                  break;
                case "Restarted":
                  setPhase(Phase.LOBBY)
                  break;
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
        )
      }
      connectRsocket()
        .then(() => setConnected(true))
        .catch(console.error)
    }

    return () => {
      ignore = true
      requester?.current?.cancel()
    }
  }, [])

  useEffect(() => {
    if (connected && player) {
      requester.current!.onNext({
        data: Buffer.from(new CloudEvent<JoinRequest>({
          id: crypto.randomUUID(),
          source: "https://snaptap.adombi.dev",
          type: "com.tapsnap.game_server.JoinRequest",
          data: {
            "playerName": player
          }
        }).toString()),
        metadata: createRoute(`tap-snap/${gameId}`)
      }, false)
    }
  }, [connected, player]);

  useEffect(() => {
    if (phase === Phase.IN_PROGRESS) {
      setTimeout(() => {
        if (!reacted.current) {
          requester.current?.onNext({
            data: Buffer.from(new CloudEvent<Reaction>({
              id: crypto.randomUUID(),
              source: "https://snaptap.adombi.dev",
              type: "com.tapsnap.game_server.React",
              data: {
                playerName: player!,
                respondTimeMillis: 1000
              }
            }).toString()),
            metadata: createRoute(`tap-snap/${gameId}`)
          }, false)
          reacted.current = true
        }
      }, 1000)
    }
  }, [phase, model]);

  if (player === undefined) return <NameModal/>
  if (requester === undefined || game === undefined) return <div>Loading game...</div>

  switch (phase) {
    case Phase.LOBBY:
      return <div className="magicpattern-default px-20">
        <div className="background game-bg h-full">
          <h1
            className="font-extrabold leading-none lg:text-6xl md:text-5xl pt-10 sm:pt-20 text-4xl text-center text-gray-300 tracking-tight">
            {gameId} Lobby
          </h1>
          <h2
            className="font-extrabold leading-none lg:text-4xl md:text-3xl text-2xl p-5 text-center text-gray-300 tracking-tight">
            Waiting for other players to join<span className="loading">...</span>
          </h2>
          <div className="font-extrabold leading-none lg:text-xl md:text-xl text-xl p-5 text-center text-gray-300 tracking-tight">Current players</div>
          <ul className="flex flex-col items-center gap-2 text-center w-full">
            {game.users.map((user: string) => (
              <li
                key={user}
                className="text-2xl font-semibold me-2 px-2.5 py-1 w-64 rounded text-orange-500 bg-gray-900 border-4 border-orange-700">
                  {user}
                </li>
            ))}
          </ul>
        </div>
      </div>
    case Phase.COUNT_DOWN:
      return <div className="font-extrabold leading-none pt-10 sm:pt-20 text-9xl text-center text-gray-300 tracking-tight magicpattern-default">
        <h1>{model as string}</h1>
      </div>
    case Phase.IN_PROGRESS:
      const phase = model as PhaseModel;
      return <div onClick={() => {
        if (!reacted.current) {
          requester.current?.onNext({
            data: Buffer.from(new CloudEvent<Reaction>({
              id: crypto.randomUUID(),
              source: "https://snaptap.adombi.dev",
              type: "com.tapsnap.game_server.React",
              data: {
                playerName: player,
                respondTimeMillis: Math.min(Date.now() - phase.eventReceivedEpoch, 1000)
              }
            }).toString()),
            metadata: createRoute(`tap-snap/${gameId}`)
          }, false)
          reacted.current = true
        }
      }} className="h-full disable-selection">
        <h1 className={`font-extrabold leading-none pt-10 sm:pt-20 text-9xl text-center text-gray-300 tracking-tight magicpattern-${phase.number} h-full`}>
          Phase {phase.number}
        </h1>
      </div>
    case Phase.RESULTS:
      return <div>
        <h1>Results of {player}</h1>
        {(model as Results)[player]?.map((reactionInMillis: number, index: number) => (
          <ul key={index}>
            <li>{reactionInMillis}</li>
          </ul>
        ))}
      </div>
  }
  return <>
      <p>Game: {gameId} - {phase}</p>
      <p>Player: {player}</p>
    </>
}