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
import Lobby from "@/app/games/[slug]/Lobby";
import CountDown from "@/app/games/[slug]/CountDown";
import PlayerResults from "@/app/games/[slug]/PlayerResults";
import InProgress from "@/app/games/[slug]/InProgress";
import generateCloudEvent from "@/app/games/[slug]/CloudEventGenerator";

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
  const [attempt, setAttempt] = useState(3)
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

  async function connectRsocket() {
    const rsocket = await connector.connect()
    requester.current = rsocket.requestChannel(
      {
        data: Buffer.from(generateCloudEvent("com.tapsnap.game_server.Connect").toString()),
        metadata: createRoute(`tap-snap/${gameId}`)
      },
      9999,
      false,
      {
        onNext: (payload, isComplete) => {
          const cloudEvent: CloudEvent<unknown> = JSON.parse(payload.data?.toString() || '')
          switch (cloudEvent.type) {
            case "Joined":
              setGame(cloudEvent.data as Game)
              break;
            case "CountDown":
              setPhase(Phase.COUNT_DOWN)
              setModel(cloudEvent.data)
              break;
            case "InProgress":
              setPhase(Phase.IN_PROGRESS)
              setModel({
                number: cloudEvent.data,
                eventReceivedEpoch: Date.now()
              } as PhaseModel)
              reacted.current = false
              break;
            case "Results":
              setPhase(Phase.RESULTS)
              setModel(cloudEvent.data)
              break;
            case "Restarted":
              setPhase(Phase.LOBBY)
              setAttempt(3)
              break;
          }
          console.log(`payload[data: ${payload.data}; metadata: ${payload.metadata}]|${isComplete}`);
        },
        onError: (e) => console.error(e),
        onComplete: () => console.log('Completed!'),
        onExtension: () => {},
        request: (n) => console.log(`request(${n})`),
        cancel: () => {
          connectRsocket()
          console.warn('Canceled!');
        },
      }
    )
  }

  useEffect(() => {
    let ignore = false

    if (!ignore && !connected) {
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
        data: Buffer.from(generateCloudEvent("com.tapsnap.game_server.JoinRequest", { "playerName": player }).toString()),
        metadata: createRoute(`tap-snap/${gameId}`)
      }, false)
    }
  }, [connected, player]);

  useEffect(() => {
    if (phase === Phase.IN_PROGRESS) {
      setTimeout(() => {
        if (!reacted.current) {
          requester.current?.onNext(
            {
              data: Buffer.from(generateCloudEvent("com.tapsnap.game_server.React", {
                playerName: player!,
                respondTimeMillis: 1000
              }).toString()),
              metadata: createRoute(`tap-snap/${gameId}`)
            }, false)
          reacted.current = true
        }
      }, 1000)
    }
  }, [phase, model]);

  if (player === undefined) return <NameModal/>
  if (requester === undefined || game === undefined)
    return <div className="magicpattern-default md:px-20 xl:px-60 disable-selection">
      <div className="game-bg h-full font-extrabold leading-none text-center lg:text-6xl md:text-5xl text-4xl text-gray-300 pt-10 sm:pt-20">
        Loading<span className="loading">...</span>
      </div>
    </div>

  function onReact(phase: PhaseModel, player: string) {
    return () => {
      if (!reacted.current && attempt > 0) {
        requester.current?.onNext({
          data: Buffer.from(generateCloudEvent("com.tapsnap.game_server.React", {
            playerName: player,
            respondTimeMillis: Math.min(Date.now() - phase.eventReceivedEpoch, 1000)
          }).toString()),
          metadata: createRoute(`tap-snap/${gameId}`)
        }, false)
        reacted.current = true
      }
      setAttempt(attempt - 1)
    };
  }

  switch (phase) {
    case Phase.LOBBY:
      return <Lobby gameId={gameId} users={game.users} />
    case Phase.COUNT_DOWN:
      return <CountDown text={model as string} attemptLeft={attempt} />
    case Phase.IN_PROGRESS:
      return <InProgress phase={model as PhaseModel} attempt={attempt} onClick={onReact(model as PhaseModel, player)} />
    case Phase.RESULTS:
      return <PlayerResults results={model as Results} player={player}/>
  }
}