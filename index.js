import "dotenv/config";
import { Client } from "@xmtp/mls-client";
import * as fs from "fs";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { toBytes } from "viem";
import { generatePrivateKey } from "viem/accounts";
import cors from 'cors';
import express from 'express'
const app = express();
const port = 8000;

const urlToGroupId = {'amazon.com': 'fe2200f01ad87a7576d363a1db800518'}

// Function to send a message to a specific group
async function sendMessageToGroup(client, groupId, messageContent) {
  const conversation = client.conversations.getConversationById(groupId);
  if (!conversation) {
    console.log(`No conversation found with ID: ${groupId}`);
    return;
  }
  await conversation.send(messageContent);
  console.log(`Message sent to group ${groupId}: ${messageContent}`);
}

export default async function sendMsgExternal(wallet, url, messageContent) {
  if (!fs.existsSync(`.cache`)) {
      fs.mkdirSync(`.cache`);
    }
  const client = await setupClient(wallet, {
      dbPath: `.cache/${wallet.account?.address}-${"prod"}`,
  });
  await registerClient(client, wallet);
  if (urlToGroupId[url] == undefined) {
    // if a group has not been created for url, make it \
    const conversation = await client.conversations.newConversation([
    ]);
    urlToGroupId[url] = conversation.id
  }
    const convo = await client.conversations.getConversationById(urlToGroupId[url])
  convo.send(messageContent)
}

// Function to create a wallet from a private key
async function createWallet() {
  let key = process.env.KEY;
  if (!key) {
    key = generatePrivateKey();
    console.error(
      "KEY not set. Using random one. For using your own wallet , set the KEY environment variable.",
    );
    console.log("Random private key: ", key);
  }

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });
  console.log(`Init wallet ${account.address}`);
  return wallet;
}


/**const wallet = await createWallet();
    // Set up the XMTP client with the wallet and database path
    if (!fs.existsSync(`.cache`)) {
      fs.mkdirSync(`.cache`);
    }
  const client = await setupClient(wallet, {
      dbPath: `.cache/${wallet.account?.address}-${"prod"}`,
  });
      await registerClient(client, wallet);

  if (urlToGroupId[url] == undefined) {
    // if a group has not been created for url, make it \
    const conversation = await client.conversations.newConversation([
    ]);
    urlToGroupId[url] = conversation.id
  }
  const convo = await client.conversations.getConversationById(urlToGroupId[url])
  //await convo.send("lmfao") */


// Function to create and setup the XMTP client
async function setupClient(wallet, config = {}) {
  let initialConfig = {
    env: "dev",
  };
  const finalConfig = { ...initialConfig, ...config };

  const client = await Client.create(wallet.account?.address, finalConfig);
  console.log("Inbox id: ", client.inboxId);
  return client;
}

// Function to register the client if not already registered
async function registerClient(client, wallet) {
  if (!client.isRegistered) {
        

    const signature = toBytes(
      await wallet.signMessage({
        message: client.signatureText,
      }),
    );
    client.addEcdsaSignature(signature);
    await client.registerIdentity();
  }
}

// Function to handle conversations
async function handleConversations(client) {
  await client.conversations.sync();
  const conversations = await client.conversations.list();
  console.log(`Total conversations: ${conversations.length}`);
  for (const conv of conversations) {
    console.log(`Handling conversation with ID: ${conv.id}`);
    await conv.sync();
    const messages = await conv.messages();
    console.log(`Total messages in conversation: ${messages.length}`);
    for (let i = 0; i < messages.length; i++) {
      console.log(`Message ${i}: ${messages[i].content}`);
    }
  }
}
// Function to stream all messages and respond to new ones
async function streamAndRespond(client) {
  console.log("Started streaming messages");
  const stream = await client.conversations.streamAllMessages();
  for await (const message of stream) {
    console.log(`Streamed message: ${message.content}`);
    if (message.senderInboxId !== client.inboxId) {
      sendMessageToGroup(client, message.conversationId, "gm");
    }
  }
}
async function createGroupConversation(client) {
  const conversation = await client.conversations.newConversation([
    "0x277C0dd35520dB4aaDDB45d4690aB79353D3368b",
    "0x13956e5424b9ce4E6C3ca8C070AFff329B371784",
  ]);
  console.log(conversation.id);
}
// Main function to run the application
async function main() {
  // Create a new wallet instance
  const wallet = await createWallet();
  // Set up the XMTP client with the wallet and database path
  if (!fs.existsSync(`.cache`)) {
    fs.mkdirSync(`.cache`);
  }
  const client = await setupClient(wallet, {
    dbPath: `.cache/${wallet.account?.address}-${"prod"}`,
  });
  // Register the client with the XMTP network if not already registered
  await registerClient(client, wallet);
  // Handle existing conversations
  await handleConversations(client);

  // Run message streaming in a parallel thread to respond to new messages
  (async () => {
    await streamAndRespond(client);
  })();
}
// Example usage

async function createConvoTest(url) {
  if (urlToGroupId[url] == undefined) {
    const wallet = await createWallet();
    // Set up the XMTP client with the wallet and database path
    if (!fs.existsSync(`.cache`)) {
      fs.mkdirSync(`.cache`);
    }
    const client = await setupClient(wallet, {
      dbPath: `.cache/${wallet.account?.address}-${"prod"}`,
    });
    // Register the client with the XMTP network if not already registered
    await registerClient(client, wallet);
    const conversation = await client.conversations.newConversation([
    ]);
    console.log(conversation.id);

    urlToGroupId[url] = conversation.id
    
    return conversation.id
  }
  //else
  console.log("already exists a group id for that url")
  return urlToGroupId[url]
}

async function test() {
  console.log(await createConvoTest("chatgpt.com"))
}

async function run() {
  const wallet = await createWallet();
    // Set up the XMTP client with the wallet and database path
    if (!fs.existsSync(`.cache`)) {
      fs.mkdirSync(`.cache`);
    }
    const client = await setupClient(wallet, {
      dbPath: `.cache/${wallet.account?.address}-${"prod"}`,
    });
  
  await sendMessageToGroup(client, 'fe2200f01ad87a7576d363a1db800518', "gm");
      console.log((await client.conversations.getConversationById('fe2200f01ad87a7576d363a1db800518')).messages())

}


async function getMessagesByUrl(url) {
  const wallet = await createWallet();
    // Set up the XMTP client with the wallet and database path
    if (!fs.existsSync(`.cache`)) {
      fs.mkdirSync(`.cache`);
    }
  const client = await setupClient(wallet, {
      dbPath: `.cache/${wallet.account?.address}-${"prod"}`,
  });
  await registerClient(client, wallet);

  if (urlToGroupId[url] == undefined) {
    // if a group has not been created for url, make it \
    const conversation = await client.conversations.newConversation([
    ]);
    console.log("creating new group")
    urlToGroupId[url] = conversation.id
  }
  const convo = await client.conversations.getConversationById(urlToGroupId[url])
  //await convo.send("lmfao")
  return convo.messages()
  
}


app.use(cors({
  origin: 'http://localhost:3000', // Allow only your frontend URL
  methods: 'GET,POST,PUT,DELETE,OPTIONS', // Allow specific HTTP methods
  allowedHeaders: 'Content-Type,Authorization' // Allow specific headers
}));

// Middleware
app.use(express.json());

// Route handling string input via query parameter
app.get('/api/fetch', async (req, res) => {
  const url = req.query.url;
  if (req.query.msg) {
    try {
      const msg = req.query.msg
      console.log('received msg send rq:' + req.query.msg)
      console.log("url:" + req.query.url)
      const wallet = await createWallet();
      // Set up the XMTP client with the wallet and database path
      if (!fs.existsSync(`.cache`)) {
        fs.mkdirSync(`.cache`);
      }
      const client = await setupClient(wallet, {
        dbPath: `.cache/${wallet.account?.address}-${"prod"}`,
      });
      await registerClient(client, wallet);
      const convo = await client.conversations.getConversationById(urlToGroupId[url])
      console.log(convo)
      await convo.send(msg)
      res.json("successfully sent message")
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'An unexpected error occurred.' });
      // test
    }
  } else {
    try {
    
      console.log("received a request!");
       // Access query parameter 'url'
      if (typeof url === 'string') {
        const data = await getMessagesByUrl(url);
        res.json(data);
      } else {
        res.status(400).json({ error: 'url query parameter is required and must be a string.' });
      }
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'An unexpected error occurred.' });
    }
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
