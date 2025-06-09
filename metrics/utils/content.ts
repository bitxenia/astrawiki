import { generateLoremIpsum } from "./metrics";

export type Length = "short" | "medium" | "large";

export function getContent(length: Length): string {
  if (length === "short") {
    return generateLoremIpsum(5000);
  } else if (length === "medium") {
    return generateLoremIpsum(10000);
  } else {
    return generateLoremIpsum(50000);
  }
}
