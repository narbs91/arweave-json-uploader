# Arweave-uploader

A simple node.js script to upload json data to the [Arweave Blockchain](https://www.arweave.org/) via CSV

## Dependencies

1. [ts-node](https://github.com/TypeStrong/ts-node)
2. [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
3. You will need an [ArConnect wallet](https://arconnect.io/) with funds to actually write to the blockchain.  You can claim a small amount of AR tokens following this [guide](https://faucet.arweave.net/) to set up a new wallet if you so choose.

## How to build

The only thing need to build the script is download all the dependencies via the `yarn` command.

## How to run

The script runs entirely through the command line and can be run with the following command and option below:

**Options**

- `-d, --dryrun <type>` : run the script in dryrun mode which will not upload to the blockchain.  Defaults to true if not passed

**Running the script**


```bash
ts-node uploader
```

**Run the script with dryrun off**

```bash
ts-node uploader -d false
```

**Checking upload results**

You can check the results of the run in the `resources/service.log` file after the script has finished running.