import Arweave from 'arweave';
import TestWeave from 'testweave-sdk';
import { tag } from '../src/types/arweave-types';
import winston from "winston";
import { TESTWEAVE_ENDPOINT } from '../src/utils/arweaveUploaderContsants';
import { uploadRequest } from '../src/types/arweave-types';
import { ArweaveSigner, bundleAndSignData, createData, Bundle } from "arbundles";

const ARWEAVE_ADDRESS = "MlV6DeOtRmakDOf6vgOBlif795tcWimgyPsYYNQ8q1Y";

const LOGGER = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: './logs/service.log' })
    ]
});

const arweave = Arweave.init({
    host: 'localhost',
    port: 1984,
    protocol: 'http',
    timeout: 20000,
    logging: false,
});
const testInstance = TestWeave.init(arweave as any);


export const uploadBulkToTestWeave = async (requests: uploadRequest[]) => {
    const signer = new ArweaveSigner((await testInstance).rootJWK);

    const _data = [];

    for (let i = 0; i < requests.length; i++) {
        _data.push(await createData(requests[i].data, signer, { tags: requests[i].tags }));
    }

    const bundle = await bundleAndSignData(_data, signer);

    const tx = await bundle.toTransaction(arweave, (await testInstance).rootJWK);

    LOGGER.info("-------TesWeave Transaction-------");

    await arweave.transactions.sign(tx, (await testInstance).rootJWK);

    LOGGER.info(`[Transaction log] transactionId=${tx.id}, transaction=${JSON.stringify(tx)}`);

    try {
        await arweave.transactions.post(tx).then(async () => {
            // Mine the transaction
            await (await testInstance).mine()
                .then(() => {
                    return tx.id;
                })
                .catch((err) => {
                    LOGGER.error(`[Error occurred while attempting to mine] error=${err}`);

                    throw "Error occurred while mining transaction"
                })
        })

    } catch (e) {
        LOGGER.error(`[Error occurred uploading data], transactionId=${tx.id}, error=${e}`);

        throw "Error occurred uploading data through bundler";
    }

    return tx.id;
}

export const uploadToTestWeave = async (_data: string, _tags: tag[]) => {
    let transaction = await arweave.createTransaction({
        data: _data
    }, (await testInstance).rootJWK)

    _tags.forEach(tag => {
        transaction.addTag(tag.name, tag.value)
    });

    LOGGER.info("-------Testweave Transaction-------");

    await arweave.transactions.sign(transaction, (await testInstance).rootJWK)
        .then(async () => {
            LOGGER.info(`[Transaction log] transactionId=${transaction.id}, transaction=${JSON.stringify(transaction)}`);
            
            let uploader = await arweave.transactions.getUploader(transaction);

            LOGGER.info("-------Beginning to upload data to the test weave-------");

            while (!uploader.isComplete) {
                try {
                    await uploader.uploadChunk();

                    LOGGER.info(`[Upload Progress] transactionId=${transaction.id}, ${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`);
                } catch (e) {
                    LOGGER.error(`[Error occurred uploading data], error=${e}`);

                    throw "Error occurred uploading data";
                }
            }
        }).then(async () => {
            // Mine the transaction
            await (await testInstance).mine()
                .then(() => {
                    return transaction.id;
                })
                .catch((err) => {
                    LOGGER.error(`[Error occurred while attempting to mine] error=${err}`);

                    throw "Error occurred while mining transaction"
                })
        })

    return transaction.id;
}

export const getTestWalletBalance = async () => {
    LOGGER.info(`[Retrieving Arweave wallet balance] address=${ARWEAVE_ADDRESS}`);

    const balance = await arweave.wallets.getBalance(ARWEAVE_ADDRESS as string);
    let ar = arweave.ar.winstonToAr(balance);

    LOGGER.info(`[Testweave wallet balance retrieved] balance=${parseFloat(ar)}`);

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

export const logStatusForTransactionFromTestWeave = async (transactionId: string) => {
    // Read the transaction status
    arweave.transactions.getStatus(transactionId).then((res) => {
        LOGGER.info(`[Transaction status] transactionId=${transactionId}, status=${res.status}, confirmations=${res.confirmed?.number_of_confirmations}, linkToData=${TESTWEAVE_ENDPOINT}/${transactionId}`);
    }).catch((err) => {
        LOGGER.error(`[Error occurred while retrieving status] transactionId=${transactionId}, e=${err}`);
    })
}