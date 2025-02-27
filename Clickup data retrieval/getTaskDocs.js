import fs from "fs/promises";
import fetch from "node-fetch";

const API_KEY = "";
const WORKSPACE_ID = "";
const OUTPUT_DIR = "/home/dg/Downloads/Linear/Clickupdata/taskDocs";

const fetchData = async (url, retries = 10) => {
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

      if (!response.ok) {
        console.error(`Error fetching: ${url} | Status: ${response.status} - ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching:", url, error);
    }
  }
  return null;
};

const saveToFile = async (filename, data) => {
  try {
    const safeFilename = filename.replace(/[<>:"/\\|?*]+/g, ""); 
    const spaceDir = `${OUTPUT_DIR}`;

    await fs.mkdir(spaceDir, { recursive: true });
    await fs.writeFile(`${spaceDir}/${safeFilename}.json`, JSON.stringify(data, null, 2));
    
    console.log(`✅ Saved: ${safeFilename}`);
  } catch (error) {
    console.error(`Error saving file: ${filename}`, error);
  }
};

const getTasks = async (listId) => {
  let allTasks = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.clickup.com/api/v2/list/${listId}/task?subtasks=true&include_closed=true&page=${page}`;
    const response = await fetchData(url);

    if (response?.tasks?.length) {
      allTasks = allTasks.concat(response.tasks);
      page++;
    } else {
      hasMore = false;
    }
  }

  return allTasks;
};

const searchDocs = async (parentId) => {
  const url = `https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/docs?deleted=false&archived=false&parent_id=${parentId}&parent_type=1&limit=100`;

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
  const url = `https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/docs/${docId}/pages`;
  return fetchData(url);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const processClickUpDocs = async () => {
  const listId = 900200516438;
  const tasks = await getTasks(listId);

  if (!tasks?.length) {
    console.log("No tasks found.");
    return;
  }

  for (const task of tasks) {
    await delay(1000);
    const taskDocs = await searchDocs(task.id);

    if (!taskDocs?.length) {
      console.log(`No docs found for Task: ${task.name} (${task.id})`);
      continue;
    }

    for (const doc of taskDocs) {
      await delay(1000);
      const pages = await getDocPages(doc.id);

      if (!pages) {
        console.log(`No pages found for Doc: ${doc.name} (${doc.id})`);
        continue;
      }

      const filename = `Product-MSP_Task-${task.id}-${doc.name}-${doc.id}`;
      await saveToFile(filename, pages);
    }
  }
};

// processClickUpDocs();

processClickUpEngDocs()
