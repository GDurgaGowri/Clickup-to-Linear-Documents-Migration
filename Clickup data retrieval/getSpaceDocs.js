import fs from "fs/promises";
import fetch from "node-fetch";

const API_KEY = "";
const WORKSPACE_ID = "";
const OUTPUT_DIR = "/home/dg/Downloads/Linear/Clickupdata";

const fetchData = async (url) => {
  try {
    const response = await fetch(url, {
      headers: { Authorization: API_KEY, accept: "application/json" },
    });
    return response.ok ? response.json() : null;
  } catch (error) {
    console.error("Error fetching:", url, error);
    return null;
  }
};

const saveToFile = async (spaceName, filename, data) => {
  try {
    const spaceDir = `${OUTPUT_DIR}/${spaceName}`;
    await fs.mkdir(spaceDir, { recursive: true });
    await fs.writeFile(`${spaceDir}/${filename}.json`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving file:", filename, error);
  }
};

const getSpaces = async () => {
  const url = `https://api.clickup.com/api/v2/team/${WORKSPACE_ID}/space`;
  return fetchData(url);
};

const getFolders = async (spaceId) => {
  const url = `https://api.clickup.com/api/v2/space/${spaceId}/folder`;
  return fetchData(url);
};

const getLists = async (spaceId, folderId = "") => {
  const url = folderId
    ? `https://api.clickup.com/api/v2/folder/${folderId}/list`
    : `https://api.clickup.com/api/v2/space/${spaceId}/list`;
  return fetchData(url);
};

const searchDocs = async (parentId, parentType) => {
  const url = `https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/docs?deleted=false&archived=false&parent_id=${parentId}&parent_type=${parentType}&limit=100`;
  return fetchData(url);
};

const getDocPages = async (docId) => {
  const url = `https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/docs/${docId}/pages`;
  return fetchData(url);
};

const processClickUpDocs = async () => {
  const spaces = await getSpaces();
  if (!spaces?.spaces) return;

  for (const space of spaces.spaces) {
    console.log(`Processing Space: ${space.name}`);
    const spaceName = space.name
    // Process space-level docs
    const spaceDocs = await searchDocs(space.id, 4);
    try {
      
      if (!spaceDocs?.docs) {
        console.warn(`No docs found for space: ${space.name} (ID: ${space.id})`);
        continue; // Skip to next space
      }
    } catch (error) {
      console.error(`Error fetching docs for space: ${space.name} (ID: ${space.id})`, error);
    }

    if (spaceDocs?.docs) {
      for (const doc of spaceDocs.docs) {
        const pages = await getDocPages(doc.id);
        await saveToFile(spaceName, `${doc.name}-${doc.id}`, pages);
      }
    }
    else{
        console.log(`No docs in ${space.name}-${docs.length}`)
    }

    //  folders
    const folders = await getFolders(space.id);
    if (folders?.folders) {
      for (const folder of folders.folders) {
        const folderDocs = await searchDocs(folder.id, 5);
        if (folderDocs?.docs) {
          for (const doc of folderDocs.docs) {
            const pages = await getDocPages(doc.id);
            await saveToFile(spaceName, `${folder.name}-${folder.id}-${doc.name}-${doc.id}`, pages);
          }
        }

        //  lists inside folder
        const listInsideFolder = await getLists(space.id, folder.id);
        if (listInsideFolder?.lists) {
          for (const list of listInsideFolder.lists) {
            console.log(`    Processing List: ${list.name}`);
            const folderListsDocs = await searchDocs(list.id, 6);
            if (folderListsDocs?.docs) {
              for (const doc of folderListsDocs.docs) {
                const pages = await getDocPages(doc.id);
                await saveToFile(spaceName, `${folder.name}-${folder.id}-${list.name}-${doc.name}-${doc.id}`, pages);
              }
            }
          }
        }
      }
    }

    // lists directly under space
    const lists = await getLists(space.id);
    if (lists?.lists) {
      for (const list of lists.lists) {
        const listDocs = await searchDocs(list.id, 6);
        if (listDocs?.docs) {
          for (const doc of listDocs.docs) {
            const pages = await getDocPages(doc.id);
            await saveToFile(spaceName, `${list.name}-${list.id}-${doc.name}-${doc.id}`, pages);
          }
        }
      }
    }
  }
};

processClickUpDocs();