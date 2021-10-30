import { Command } from 'commander';
import { upload, logStatusForTransaction, getWalletBalance } from "./src/client/arweave-client";
import { uploadToTestWeave, logStatusForTransactionFromTestWeave } from "./test/testweave-client";
import { tag, uploadRequest } from "./src/types/arweave-types";
import { parseStream } from "fast-csv"
import { createReadStream } from "fs";
import winston from "winston";

const LOGGER = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: './logs/service.log' })
  ]
});

const program = new Command()
  .option('-d, --dryrun <boolean>', 'run in dry-run mode', 'true')
  .option('-t, --testweave <boolean>', 'run uploads against a locally running testweave', 'false');

const dry_run = program.parse().opts().dryrun;
const testweave = program.parse().opts().testweave;

const createUploadRequestFromRow = (row: any, headers: string[]) => {
  const tags = [] as tag[];

  headers.forEach((key) => {
    const tag = {
      name: key,
      value: JSON.stringify(row[key]).replace(/"/g, '').trim()
    }

    tags.push(tag);
  })

  const uploadRequest = {
    data: JSON.stringify(row),
    tags: tags
  } as uploadRequest;

  return uploadRequest;
}

const uploadData = async (requests: uploadRequest[]) => {
  let transactionIds = [] as string[];

  if (dry_run === "false") {

    for (let i = 0; i < requests.length; i++) {

      if (testweave === "false") {

        const userBalance = await getWalletBalance();

        if (parseFloat(userBalance) === 0) {
          LOGGER.error(`[Insufficient funds in balance.  Upload process halted] balance=${parseFloat(userBalance)}, haltedRequest=${JSON.stringify(requests[i])}`)
          break;
        }

        await upload(requests[i].data, requests[i].tags)
          .then((transactionId) => {
            transactionIds.push(transactionId);
          })
          .catch((err) => {
            LOGGER.error(`[Upload to weave failed]  error=${err}, request=${JSON.stringify(requests[i])}`);
          })

      } else {
        await uploadToTestWeave(requests[i].data, requests[i].tags)
          .then(async (transactionId) => {
            transactionIds.push(transactionId);
          })
          .catch((err) => {
            LOGGER.error(`[Upload to testweave failed.  Make sure that your local test weave instance is running] error=${err}, request=${JSON.stringify(requests[i])}`);
          })
      }
    }
  }

  return transactionIds;
}

const readAndUploadDataFromCSV = async () => {
  LOGGER.info(`[Script configuration overview] Dry_Run=${dry_run}, Environment=${testweave === "true" ? 'testweave' : 'arweave'}`);

  let requests: uploadRequest[] = [];

  const stream = createReadStream('resources/sample.csv');

  // The headers of the CSV act as our keys for the tags we attach to the data we upload
  let headers = [] as string[];

  parseStream(stream, { headers: true, ignoreEmpty: true })
    .on('headers', _headers => {
      headers = _headers;
      LOGGER.info(`[Headers parsed] headers=${headers}`);
    })
    .on('error', error => LOGGER.error(`[Error parsing CSV] Error=${error}`))
    .on('data', ((row) => {
      const uploadRequest = createUploadRequestFromRow(row, headers);

      if (dry_run === "true") {
        LOGGER.info(`[Row processed] row=${JSON.stringify(row)}`);
        LOGGER.info(`[Upload Request] ${JSON.stringify(uploadRequest)}`);
      }

      requests.push(uploadRequest);

    }))
    .on('end', async (rowCount: number) => {
      LOGGER.info(`[CSV processing completed] Parsed ${rowCount} rows`);

      uploadData(requests)
        .then(async (transactionIds) => {
          LOGGER.info("-------transaction status-------");
          LOGGER.info(`[Data upload complete] ${transactionIds.length} out of ${requests.length} requests submitted to the network`);

          if (dry_run === "false") {
            for (let i = 0; i < transactionIds.length; i++) {
              testweave === "true" ? await logStatusForTransactionFromTestWeave(transactionIds[i]) : await logStatusForTransaction(transactionIds[i]);
            }
          }
        });

    });
}

readAndUploadDataFromCSV();