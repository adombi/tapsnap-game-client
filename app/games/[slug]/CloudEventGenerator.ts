import {CloudEvent} from "cloudevents";

export default function generateCloudEvent<T>(type: string, data?: T) {
  return new CloudEvent<T>({
    id: crypto.randomUUID(),
    source: "https://snaptap.adombi.dev",
    type: type,
    data: data
  })
}