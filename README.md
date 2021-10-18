# Arweave-json-uploader

A simple node.js script to upload json data to the [Arweave Blockchain](https://www.arweave.org/) via CSV.  The script comes as is and the author is not liable for lost AR tokens due to misuse.

## Prerequisites

0. [ts-node](https://github.com/TypeStrong/ts-node)
1. [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
2. [nvm](https://github.com/nvm-sh/nvm)
3. You will need an Arweave wallet with funds to actually write to the blockchain.  You can create a wallet with  a small amount of AR tokens following this [guide](https://faucet.arweave.net/).  You can also create an [ArConnect wallet]((https://arconnect.io/)) as an alternative but you will not get any free AR tokens with that route.

### Recommended Prerequisite

The arweave-uploader supports running against a locally running testweave for testing purposes.  It is **highly recommended** you have run your upload against the testweave before committing to writing against the Arweave mainnet as writes are permanent and cost actual AR token.  Follow the instructions in the official ArweaveTeam [teastweave-docker repo](https://github.com/ArweaveTeam/testweave-docker) to get yourself up and running with a local testweave docker container.  Instructions on how to install docker on your system is provided in the guide above.  

*Note:* You do not have to worry about the [TestWeave SDK](https://github.com/ArweaveTeam/testweave-sdk) as the arweave-uploader script already has it integrated.

## Usage

### Setting your env variables

The script assumes you have the following environment variables defined in your system: `ARWEAVE_ADDRESS` and `ARWEAVE_KEY`.  To set these variables in your system (assuming a MacOS or Linux OS), do the following:

0. Find the Arweave wallet json file you set up in step 3 of the prerequisites, it will look like `arweave-key-yourPublicKey.json`. Copy your public key from the file name (i.e. the `yourPublicKey` portion)
1. Open up a terminal and go to your root directory via `cd ~`
2. In your terminal you will want to open your `.zshrc` *or* `.bashrc` file (depending on what terminal you use) via `vim .zshrc` or `vim .bashrc` respectively.  If you don't have any of those file(s) defined already the above command(s) will handle creating them for you.
3. Type `i` to enter edit mode and add the following to your file: `export ARWEAVE_ADDRESS='put your public key here'`
4. Open your `arweave-key-yourPublicKey.json` file with an editor (ATOM, Sublime, VSCode, etc...) and copy the entire contents.
5. Go back to your terminal with VIM open and add the following entry underneath your `ARWEAVE_ADDRESS`:  `export ARWEAVE_KEY='the json you just copied'`
6. Press the `esc` key on your keyboard to exit editing mode, type `:x` and press enter to save the file and close VIM at the same time.
7. Close your terminal window and open another one so that your changes can be reflected.  Type `echo $ARWEAVE_ADDRESS && echo $ARWEAVE_KEY` and press enter.  If you did things correctly you should see you Arweave public address and key printed on screen.

*Note*: With the above complete you will have store you public and private keys locally on your machine.  As always never disclose your private key to anyone so that you can keep your funds safe.

For more information about setting up environment variables you can check out this [blog post](https://www.twilio.com/blog/2017/01/how-to-set-environment-variables.html)

### How to build

0. Run `nvm` in the project root directory
1. Run `yarn` to pull in the dependencies

### Content source

The script uses the `resources/sample.csv` as the source of content when preforming an upload.  A given row represents the data (the actual contents of the JSON) portion of what will be uploaded to the weave and the headers represent the tags (key/value pairs as metadata) that will be set on that data (Please see the [developer api docs](https://docs.arweave.org/developers/server/http-api#field-definitions) for more information).  Please adjust this file as needed with the data you wish to upload; however, this script is only intended to upload JSON in it's current form so you have to leave the `Content-Type` header and `application/json` value in each row so that things work as expected.

You might be asking why the same data is being uploaded as the main content and as metadata at the same time.  The author took this approach due to the fact that the [Arweave graphQL api](https://gql-guide.vercel.app/) does not support querying for data specifically and wanted a way for data to be searchable/available through a single entry point.  

**Important**: As a caveat to above design decision one must note that Arweave has a max limit of **2048 bytes** total for all tags in a given upload (so in our case a given row in our CSV).  If this doesn't work for your needs, please feel free to fork this repo and mold the script to your liking.

### Command Line Options

The script runs entirely through the command line and can be run with the following command and option below:

**Options**

- `-d, --dryrun <boolean>` : Run the script in dryrun mode which will not upload to the blockchain giving you a chance to observe requests before committing to uploading.  Defaults to *true* if not passed
- `-t, --testweave <boolean>` : Run uploads against a locally running testweave.  Defaults to *false* if not passed

### How to run the script

0. Open up a terminal and traverse to the project root i.e. `cd some/path/to/arweave-uploader`
1. Replace the content of `resources/sample.csv` with the data of your liking, making sure to keep `Content-Type` in the header and `application/json` as the first value in each row.
2. Run `ts-node -d true` to run the script in `dryrun` mode to observe how your requests will look like without actually uploading.
3. Observe the `logs/service.log` file to see if your data looks like you expect it to
4. **(Optional but recommend)** Open a separate terminal and traverse to where the `testweave-docker` repo is located i.e. `cd some/path/to/testweave-docker`.
5. **(Optional but recommend)** In the `testweave-docker` project root run `docker-compose up` to start up the testweave node.
6. **(Optional but recommend)** Go back to the original terminal window you opened with the `arweave-uploader` project root and run `ts-node -d false -t true` to begin an actual upload to your local testweave.
7. **(Optional but recommend)** Once the upload is finished, observe the `logs/service.log` file to see the results
8. Assuming you are satisfied with your dryrun and/or testweave uploads you can now upload to the Arweave mainnet via `ts-node -d false -t false` (**Warning:** This step will actually consume AR tokens from your wallet)
9. Once the upload is finished, observe the `logs/service.log` file to see the results

**Checking upload results**

After running an upload, the logs in `resources/service.log` will provide you information around the actual transaction id's of each upload, the status of the uploads, as well as a link to either view you transaction on [viewblock](https://viewblock.io/arweave) (if you uploaded to the mainnet) or the actual data on your local running testweave (if you uploaded to your testweave docker instance).  Please note that when uploading to the mainnet, as with any other blockchain, it takes time for participants to confirm/verify your transaction so you might not see your data show up right away.  Be patient and check back intermittently until the data finally shows up on chain.  You can also check your wallet to see if the transaction costs have been reflected on your account.

In general you can view the actual contents of your upload by hitting `https://arweave.net/{transactionId}` in your browser.  You can also use the [graphql endpoint](https://arweave.net/graphql) to query against the weave.  A example relevant to this project is searching for a given transaction using tags as a filter

```javascript
query {
    transactions(
        tags: [
          {
            name: "key1",
            values: ["value1"]
          },
          {
            name: "key2",
            values: ["value2"]
        }
        ]
    ) {
        edges {
            node {
                id
              tags {
                name
                value
              }
            }
        }
    }
}
```

Please view the [graphQL documentation](https://gql-guide.vercel.app/) or the [http api docs](https://docs.arweave.org/developers/server/http-api) for more examples on how/what your can query.