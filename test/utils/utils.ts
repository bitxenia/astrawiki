import * as fs from "fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const LOREM_IPSUM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ";

/**
 * Saves the metrics to a file in the metrics directory
 * @param results - the metrics to save
 * @param filename - the name of the file to save the metrics to
 */
export const saveMetrics = <T>(results: T[], filename: string) => {
  const metricsDir = `${__dirname}/../metrics`;
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir);
  }
  const timeStamp = new Date().getTime();
  const fullFilename = `${metricsDir}/${filename}_${timeStamp}.json`;

  // Custom replacer to handle BigInt serialization
  const replacer = (key: string, value: T) =>
    typeof value === "bigint" ? value.toString() : value;

  fs.writeFileSync(fullFilename, JSON.stringify(results, replacer, 2));
  console.log(`Metrics written to ${fullFilename}`);
};

/**
 * Generates a Lorem Ipsum string of the specified byte length
 * @param bytes - the number of bytes to generate
 */
export const generateLoremIpsum = (bytes: number): string => {
  return LOREM_IPSUM.repeat(Math.ceil(bytes / LOREM_IPSUM.length)).slice(
    0,
    5000,
  );
};
