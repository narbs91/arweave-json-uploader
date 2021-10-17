import Arweave from 'arweave';
import { tag } from '../types/arweave-types';
import winston from "winston";
import { VIEWBLOCK_ADDRESS } from '../utils/arweaveUploaderContsants';
import { JWKInterface } from 'arweave/node/lib/wallet';

// The script assumes these values are part of your environment variables
const ARWEAVE_ADDRESS = process.env.ARWEAVE_ADDRESS;
const ARWEAVE_KEY = JSON.parse(process.env.ARWEAVE_KEY as string) as JWKInterface;

const LOGGER = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: './logs/service.log' })
    ]
});

// Required configuration according to issue: https://github.com/ArweaveTeam/arweave-js/issues/103
const arweave = Arweave.init({
    host: 'arweave.net',
    protocol: 'https',
    port: 443
});

export const upload = async (_data: string, _tags: tag[]) => {
    let transaction = await arweave.createTransaction({
        data: _data
    }, ARWEAVE_KEY)

    _tags.forEach(tag => {
        transaction.addTag(tag.key, tag.value)
    });

    LOGGER.info("-------Transaction-------");
    LOGGER.info(`[Transaction log] transactionId=${transaction.id}, transaction=${JSON.stringify(transaction)}`);

    await arweave.transactions.sign(transaction, ARWEAVE_KEY)
        .then(async () => {
            let uploader = await arweave.transactions.getUploader(transaction);

            LOGGER.info("-------Beginning to upload data to the weave-------");

            while (!uploader.isComplete) {
                try {
                    await uploader.uploadChunk();

                    LOGGER.info(`[Upload Progress] transactionId=${transaction.id}, ${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`);
                } catch (e) {
                    LOGGER.error(`[Error occurred uploading data], transactionId=${transaction.id}, error=${e}`);

                    throw "Error occurred uploading data";
                }
            }
        })

    return transaction.id;
}

export const getWalletBalance = async () => {
    LOGGER.info(`[Retrieving Arweave wallet balance] address=${ARWEAVE_ADDRESS}`);

    const balance = await arweave.wallets.getBalance(ARWEAVE_ADDRESS as string);
    let ar = arweave.ar.winstonToAr(balance);

    LOGGER.info(`[Arweave wallet balance retrieved] balance=${ar}`);

    return ar;
}

export const getDataForTransaction = async (transactionId: string) => {
    // Read decoded data from Arweave
    arweave.transactions.getData(transactionId, {
        decode: true, string: true
    }).then(response => {
        LOGGER.info(`[Transaction data retrieved for upload] data=${response}`)

        return response;
    })
}

export const logStatusForTransaction = async (transactionId: string) => {
    // Read the transaction status
    arweave.transactions.getStatus(transactionId).then((res) => {
        LOGGER.info(`[Transaction status] transactionId=${transactionId}, status=${res.status}, confirmations=${res.confirmed?.number_of_confirmations}, explorerLink=${VIEWBLOCK_ADDRESS}/${transactionId}`);
    }).catch((err) => {
        LOGGER.error(`[Error occurred while retrieving status] transactionId=${transactionId}, e=${err}`);
    })
}