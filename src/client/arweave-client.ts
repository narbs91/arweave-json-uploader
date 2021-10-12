import Arweave from 'arweave';
import { tag } from '../types/arweave-types';
import winston from "winston";
import { VIEWBLOCK_ADDRESS } from '../utils/arweaveUploaderContsants';

const LOGGER = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: './resources/service.log' })
    ]
});

const arweave = Arweave.init({
    host: 'arweave.net'
    // (leave object blank to interact with local network)
    // host: '127.0.0.1',
    // port: 1984,
    // protocol: 'http'
});

const ARWEAVE_ADDRESS = process.env.ARWEAVE_ADDRESS;

export const createTransaction = async (_data: string, _tags: tag[]) => {
    let transaction = await arweave.createTransaction({
        data: _data
    })

    _tags.forEach(tag => {
        transaction.addTag(tag.key, tag.value)
    });

    LOGGER.info("-------Transaction-------");
    LOGGER.info(transaction);

    await arweave.transactions.sign(transaction);

    let uploader = await arweave.transactions.getUploader(transaction);

    LOGGER.info("-------Beginning to upload data to the weave-------");

    while (!uploader.isComplete) {
        try {
            await uploader.uploadChunk();
            LOGGER.info(`[Upload Progress] ${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`);
        } catch (e) {
            LOGGER.error(`[Error occurred uploading data], error=${e}`);
        }
    }

    LOGGER.info("-------transaction status-------")
    // Read the transaction status
    let status = arweave.transactions.getStatus(transaction.id);
    LOGGER.info(`[Transaction status] transactionId=${transaction.id}, status=${status}, explorerLink=${VIEWBLOCK_ADDRESS}/${transaction.id}`);

    // Read data from Arweave
    arweave.transactions.getData(transaction.id, {
        decode: true, string: true
    }).then(response => {
        LOGGER.info(`[Transaction data retrieved for upload] data=${response}`)
    })
}

export const getWalletBalance = async () => {
    LOGGER.info(`[Retrieving Arweave wallet balance] address=${ARWEAVE_ADDRESS}`);

    const balance = await arweave.wallets.getBalance(ARWEAVE_ADDRESS as string);
    let ar = arweave.ar.winstonToAr(balance);

    LOGGER.info(`[Arweave wallet balance retrieved] balance=${ar}`);

    return ar;
}