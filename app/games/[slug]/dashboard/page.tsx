'use client'

import React, {useEffect, useRef, useState} from "react";
import {
  Cancellable,
  OnExtensionSubscriber, OnNextSubscriber, OnTerminalSubscriber,
  Requestable
} from "rsocket-core/dist/RSocket";
import MESSAGE_RSOCKET_ROUTING = WellKnownMimeType.MESSAGE_RSOCKET_ROUTING;
import {encodeCompositeMetadata, encodeRoute, WellKnownMimeType} from "rsocket-composite-metadata";
import {CloudEvent} from "cloudevents";
import {WebsocketClientTransport} from "rsocket-websocket-client";
import {RSocketConnector} from "rsocket-core";

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

interface TableRow {
  player: string,
  results: number[],
  overallResult: number
}

export default function Page({ params }: { params: { slug: string } }) {
  const gameId: string = params.slug
  const [game, setGame] = useState<Game>({id: "", users: [], results: {"": []}})
  const requester = useRef<Requestable & Cancellable & OnExtensionSubscriber>()
  const channelRequester = useRef<OnTerminalSubscriber & OnNextSubscriber & OnExtensionSubscriber & Requestable & Cancellable>()
  const connected = useRef<boolean>(false)
  const channelConnected = useRef<boolean>(false)
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

    if (!ignore && !connected.current) {
      const connectRsocket = async () => {
        const rsocket = await connector.connect()
        requester.current = rsocket.requestStream(
          {
            data: null,
            metadata: createRoute(`tap-snap/${gameId}/dashboard`)
          },
          9999,
          {
            onError: (e) => {
              console.error(e);
            },
            onNext: (payload, isComplete) => {
              console.log(
                `payload[data: ${payload.data}; metadata: ${payload.metadata}]|${isComplete}`
              );
              const cloudEvent: CloudEvent<unknown> = JSON.parse(payload.data?.toString() || '')
              if (cloudEvent.type === "UpdatedResults") {
                setGame(cloudEvent.data as Game)
              }
            },
            onComplete: () => {
              console.log('Completed!');
            },
            onExtension: () => {
            }
          }
        )
      }
      connectRsocket()
        .then(() => connected.current = true)
        .catch(reason => console.error(reason))
    }

    if (!ignore && !channelConnected.current) {
      const connectRsocket = async () => {
        const rsocket = await connector.connect()
        channelRequester.current = rsocket.requestChannel(
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
        .then(() => channelConnected.current = true)
        .catch(console.error)
    }

    return () => {
      ignore = true
      requester?.current?.cancel()
      channelRequester?.current?.cancel()
    }
  }, [connected])

  function sumOf(results: number[]) {
    return results.reduce((partialSum, a) => partialSum + a, 0);
  }

  function resultValue(result: number) {
    return result === 0 ? "-" : result
  }

  const overallResults = Object.entries(game?.results as Results)
  .map(([player, results]) => ({
    player: player,
    results: results.concat([0, 0, 0]).slice(0, 3),
    overallResult: sumOf(results)
  } as TableRow))
  // .filter(r => r.overallResult > 0)
  .sort((a, b) => {
    if (a.overallResult === 0) return 1
    if (b.overallResult === 0) return -1
    return a.overallResult < b.overallResult ? -1 : 1
  })

  return <div>
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <caption
          className="p-5 text-4xl font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800 flux">
          <div className="text-6xl">
            Dashboard for {params.slug}
          </div>
          <div className="flex gap-2 pt-5">
            <button
              type="button"
              className='px-10 py-3 rounded-xl text-white bg-gray-700 hover:bg-green-800'
              onClick={() => {
                channelRequester.current?.onNext({
                    data: Buffer.from(new CloudEvent<unknown>({
                      id: crypto.randomUUID(),
                      source: "https://snaptap.adombi.dev",
                      type: "com.tapsnap.game_server.StartGame"
                    }).toString()),
                    metadata: createRoute(`tap-snap/${gameId}`)
                  }, false)
              }}
            >
              Start
            </button>
            <button
              type="button"
              className='px-10 py-3 rounded-xl text-white bg-gray-700 hover:bg-green-800'
              onClick={() => fetch(`${process.env.NEXT_PUBLIC_HTTP_SERVER_HOST}/games/${gameId}/restart`)}
            >
              Back to lobby
            </button>
          </div>
        </caption>
        <thead
          className="text-lg text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
        <tr>
          <th scope="col" className="px-6 py-3">
            Player
          </th>
          <th scope="col" className="px-6 py-3">
            Phase 1
          </th>
          <th scope="col" className="px-6 py-3">
            Phase 2
          </th>
          <th scope="col" className="px-6 py-3">
            Phase 3
          </th>
          <th scope="col" className="px-6 py-3">
            Result
          </th>
        </tr>
        </thead>
        <tbody className="text-2xl">
        {overallResults.map(row => (
          <tr key={row.player}>
            <th>
              {row.player}
            </th>
            {row.results.map((result, i) => (
              <td key={`${row.player} - ${i}`}>
                {resultValue(result)}
              </td>
            ))}
            <td>
              {resultValue(row.overallResult)}
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>

  </div>
}