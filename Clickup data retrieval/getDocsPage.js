import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API_KEY = "";
const WORKSPACE_ID = "";
const OUTPUT_DIR = "/home/dg/Downloads/Linear/Clickupdata/Engineering";
const rootDocId = "";
const MAX_DEPTH = 8;

const allDocsContent = []; 
const fetchData = async (url, retries = 5) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: API_KEY, Accept: "application/json" },
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || 5;
        console.warn(`Rate limit exceeded. Retrying in ${retryAfter} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      return await response.json();
    } catch (error) {
      console.error("Fetch error:", error.message);
    }
  }
  return null;
};

// Get document listing (sub-documents)
const getDocListing = async (docId) => {
  const url = `https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/docs/${docId}/pageListing`;
  return await fetchData(url);
};

// Get page content
const getPageContent = async (docId) => {
  const url = `https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/docs/${rootDocId}/pages/${docId}?content_format=text%2Fmd`;
  return await fetchData(url);
};

// Save data to a single file
const saveToFile = async (data, dir, fileName) => {
  try {
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${fileName}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Saved all documents in: ${filePath}`);
  } catch (error) {
    console.error(`Error saving ${fileName}:`, error.message);
  }
};

const processClickUpEngDocs = async (docs, depth) => {
  if (depth > MAX_DEPTH) {
    console.log(`Max depth (${MAX_DEPTH}) reached.`);
    return null;
  }

  const result = [];

  for (const doc of docs) {
    const content = await getPageContent(doc.id);

    if (!content) {
      continue;
    }

    console.log(`Processing: ${content.name} (ID: ${content.id})`);

    const docNode = {
      id: content.id,
      doc_id: content.docId || rootDocId,
      name: content.name,
      content: content.content,
      pages: [],
    };

    if (doc.pages && Array.isArray(doc.pages) && doc.pages.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Delay to avoid rate limits
      const childNodes = await processClickUpEngDocs(doc.pages, depth + 1);
      if (childNodes) {
        docNode.pages = childNodes;
      }
    }

    result.push(docNode);
  }

  return result;
};

const main = async () => {
  const rootDocs = await getDocListing(rootDocId);
  const Docs = await processClickUpEngDocs(rootDocs, 1);
  if(Docs)
    await saveToFile(Docs, OUTPUT_DIR, "Engineering_All_Docs");
  else
    console.error("No documents processed.");
};

main();
