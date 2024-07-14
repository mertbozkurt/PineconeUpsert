import express from 'express';
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";
import _ from 'lodash';
import { PineconeStore } from "@langchain/pinecone";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const pinecone = new Pinecone();

app.post('/upload/:index', async (req, res) => {
  const { index } = req.params;
  const json = req.body;

  if (!json || !json.feedbacks) {
    return res.status(400).send('Invalid JSON data');
  }

  const pineconeIndex = pinecone.Index(index);
  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex }
  );

  const chunks = _.chunk(json.feedbacks, 1000);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (i % 100 === 0) {
      console.log(`Adding ${i}/${chunks.length} chunks`);
    }

    await vectorStore.addDocuments(
      chunk.map((doc) => {
        return new Document({
          pageContent: JSON.stringify(doc),
          metadata: doc,
        });
      })
    );
  }

  res.send('Data successfully uploaded and processed');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});