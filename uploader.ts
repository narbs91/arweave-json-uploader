import { Command } from 'commander';
import { getWalletBalance } from "./src/client/arweave-client";
import { tag, uploadRequest } from "./src/types/arweave-types";
import { parseStream } from "fast-csv"
import { createReadStream } from "fs";
import winston from "winston";

const LOGGER = winston.createLogger({
  transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: './resources/service.log' })
  ]
});

const program = new Command();
program
  .option('-d, --dryrun <type>', 'run in dry-run mode', 'true');

const dry_run = program.parse().opts().dryrun

const getARBalance = async () => {
  const bal = await getWalletBalance();
  console.log(bal);
}

const readDataFromCSV = () => {
  let requests: uploadRequest[] = [];

  const stream = createReadStream('resources/sample.csv');

  parseStream(stream, {headers: true})
    .on('error', error => LOGGER.error(`${error}`))
    .on('data', ((row) => {
      LOGGER.info(`[Row processed] row=${JSON.stringify(row)}`);

      const contentType = {
        key: 'Content-Type',
        value: 'application/json'
      } as tag;

      const term = {
        key: 'term',
        value: JSON.stringify(row['term']).replace(/"/g, '')
      } as tag;

      const description = {
        key: "description",
        value: JSON.stringify(row['description']).replace(/"/g, '')
      } as tag;

      const locale = {
        key: "locale",
        value: JSON.stringify(row['locale']).replace(/"/g, '')
      } as tag;

      const source = {
        key: 'source',
        value: JSON.stringify(row['source']).replace(/"/g, '')
      } as tag;

      const tags = [contentType, term, description, locale, source];

      const data = row

      const uploadRequest = {
        data: data,
        tags: tags
      } as uploadRequest;

      if (dry_run) {
        LOGGER.info(`[Upload Request] ${JSON.stringify(uploadRequest)}`);
      }

      requests.push(uploadRequest);

    }))
    .on('end', (rowCount: number) => {
      LOGGER.info(`[CSV processing completed] Parsed ${rowCount} rows`)
    });

  return requests;
}

readDataFromCSV();