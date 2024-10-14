'use client'

import React, {useEffect, useState} from "react";
import {
  Cancellable,
  OnExtensionSubscriber,
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

export default function Page({ params }: { params: { slug: string } }) {
  const gameId: string = params.slug
  const [game, setGame] = useState<Game>();
  const [requester, setRequester] = useState<Requestable & Cancellable & OnExtensionSubscriber>();
  const [connected, setConnected] = useState<boolean>(false)
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
        setRequester(rsocket.requestStream(
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
        ))
      }
      connectRsocket()
      .catch(reason => {
        setConnected(false)
        console.error(reason)
      })
    }

    return () => {
      ignore = true
      requester?.cancel()
    }
  }, [connected])

  return <div>
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <caption
          className="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
          Dashboard for {params.slug}
          <button
            type="button"
            className='h-8 px-2 text-md rounded-md bg-gray-700 hover:bg-green-800 text-white'
            onClick={() => fetch(`${process.env.NEXT_PUBLIC_HTTP_SERVER_HOST}/games/${gameId}/restart`)}
          >
            Restart
          </button>
        </caption>
        <thead
          className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
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
        <tbody>
        {Object.entries((game?.results || {}) as Results).map(([player, results]) => (
          <tr key={player}>
            <th>
              {player}
            </th>
            {results.map((result, i) => (
              <td key={`${player} - ${i}`}>
                {result}
              </td>
            ))}
            <td>
              {results.reduce((partialSum, a) => partialSum + a, 0)}
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>

  </div>
}