import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const API_TOKEN = "";
const WORKSPACE_ID = "";
const BASE_URL = `https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/docs`;
const OUTPUT_DIR = "/home/dg/Downloads/Linear/Clickupdata";

const HEADERS = {
  Authorization: API_TOKEN,
  Accept: "application/json",
};

const fetchData = async (url) => {
  try {
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", url);
    return null;
  }
};

const searchDocs = async (parentId, parentType) => {
  let url = `${BASE_URL}?deleted=false&archived=false&parent_type=${parentType}&limit=100`;
  if (parentId) {
    url += `&parent_id=${parentId}`;
  }

  let allDocs = [];
  let nextCursor = null;

  do {
    const response = await fetchData(url + (nextCursor ? `&next_cursor=${nextCursor}` : ""));
    if (response && response.docs) {
      allDocs = allDocs.concat(response.docs);
      nextCursor = response.next_cursor || null;
    } else {
      nextCursor = null;
    }
  } while (nextCursor);

  return allDocs;
};

const getDocPages = async (docId) => {
  const url = `${BASE_URL}/${docId}/pages`;
  return fetchData(url);
};

const saveToFile = async (data, dir, fileName) => {
  try {
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${fileName}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Saved: ${filePath}`);
  } catch (error) {
    console.error(`Error saving file ${fileName}:`, error.message);
  }
};

const processDocs = async (parentId, parentType, typeName) => {
  const docs = await searchDocs(parentId, parentType);
  console.log(`Total documents (${typeName}): ${docs.length}`);

  const dir = path.join(OUTPUT_DIR, typeName);
  for (const doc of docs) {
    const pages = await getDocPages(doc.id);
    if (pages) {
      // await saveToFile(pages, dir, `${doc.name}-${doc.id}_pages`);
    }
  }
};

(async () => {
  console.log("Fetching all documents (Everything)...");
  await processDocs(null, 7, "Everything");

  console.log("Fetching workspace documents...");
  await processDocs(WORKSPACE_ID, 12, "Workspace");
})();
