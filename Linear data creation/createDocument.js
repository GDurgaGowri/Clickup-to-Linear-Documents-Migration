import { LinearClient } from "@linear/sdk";
import fs from "fs"; 
import fsPromises from "fs/promises"; 
import path from "path";
import axios from "axios"; 
import FormData from "form-data"; 
import mime from "mime-types";

const linearClient = new LinearClient({apiKey: "lin_api_",});
const projectId = "";

const savedDocuments = [];
let outputLines = "";
const DIRECTORY_PATH = "/home/dg/Downloads/Linear/Clickupdata/Testingcases"; 
var i=1;

async function retryWithBackoff(fn, retries = 20, baseDelay = 500, maxDelay = 3000) {
    let attempt = 0;
    while (attempt <= retries) {
        try {
            return await fn();
        } catch (error) {
            if (error.response?.status === 429) {
                let retryAfter = error.response.headers["retry-after"] 
                    ? parseInt(error.response.headers["retry-after"]) * 1000  // Convert to milliseconds  
                    : 3600;
                if(attempt == 20)
                        retryAfter = 3600;
                await new Promise(resolve => setTimeout(resolve, retryAfter));
                console.warn(`Error`);
                retryAfter = 3600;
                await new Promise(resolve => setTimeout(resolve, retryAfter));
            }
        }
        attempt++;
        if(attempt == retries)
            attempt = 0;
    }
    throw new Error("Max retries reached. Request failed.");
}

async function main() {
    try {
        const files = await fsPromises.readdir(DIRECTORY_PATH);
        
        for (const file of files) {
            if (path.extname(file) === ".json") {
                const filePath = path.join(DIRECTORY_PATH, file);
                const fileData = await fsPromises.readFile(filePath, "utf8");
                // console.log(filePath)
                const obj = JSON.parse(fileData);
                await exportDocuments([obj]); //[obj] for single pages
            }
        }

        await getDocuments();
        saveToFile();
        await updateProjectDescription(projectId,outputLines);
        // console.log(`${outputLines}`);
        
    } catch (error) {
        console.error("Error processing files:", error);
    }
}

async function updateProjectDescription(projectId,outputLines) {
    try {
        if (!projectId) return;
        const project = await retryWithBackoff(()=> linearClient.project(projectId));
        if (!project) {
            console.error("Project not found or has no existing content.");
            return;
        }
        const updatedContent = project.content + "\n" +"**Engineering Docs**"+ "\n\n" + outputLines;//title change 
        const updDes = await retryWithBackoff(()=> linearClient.updateProject(projectId, { content: updatedContent }));
        console.log("Updated");

    } catch (error) {
        console.error("Error updating project description", error);
    }
}

async function exportDocuments(docs, depth = 1, processedDocs = new Set()) {
    const indent = " - ".repeat(depth);
    for (const doc of docs) {
        const docId = `${doc.doc_id}/${doc.id}`;
        if (processedDocs.has(docId)) {
            return;
        }
        processedDocs.add(docId);
        const isAlreadySaved = savedDocuments.some(savedDoc =>
            savedDoc.title === doc.name && savedDoc.ClickupDocId === docId
        );

        if (isAlreadySaved) return;

        if (doc.content) {
            await createDocInLinear(doc.doc_id, doc.id, doc.name, doc.content);
            let getDocUrl = null;

            if (savedDocuments.length > 0) {
                const lastSavedDoc = savedDocuments[savedDocuments.length - 1];
                if (lastSavedDoc.LinearDocId) {
                    const getDoc = await retryWithBackoff(()=> linearClient.document(lastSavedDoc.LinearDocId));
                    if (getDoc?.url) {
                        getDocUrl = getDoc.url;
                    }
                }
            }

            if (doc.name) {
                outputLines += `${indent}${getDocUrl}\n\n`;
                console.log(`Processed: ${i} ${doc.name}`);
                i++;
            }
        } else {
            if (doc.name) {
                outputLines += `${indent}${doc.name}\n\n`;
            }
        }
        if (doc.pages && doc.pages.length > 0) {
            const uniquePages = Array.from(new Map(doc.pages.map(p => [p.id, p])).values());
            await exportDocuments(uniquePages, depth + 1, processedDocs);
        }
    }
}

async function createDocInLinear(clickupParentDocId, clickupChildDocId, title, content) {
    if (!title) return;

    try {
        const documentPayload = await retryWithBackoff(()=> linearClient.createDocument({
            title,
            projectId,
            content,
        }));
        const docId = documentPayload._document?.id;
        const clickupDocIdentifier = `${clickupParentDocId}/${clickupChildDocId}`;

        savedDocuments.push({
            title,
            LinearDocId: docId,
            ClickupDocId: clickupDocIdentifier,
        });

    } catch (error) {
        console.error("Error creating document:", error);
    }
}

async function getDocuments() {
    for (const doc of savedDocuments) {
        const getDoc = await retryWithBackoff(()=> linearClient.document(doc.LinearDocId));
        if (!getDoc || !getDoc.content) continue;

        let docContent = getDoc.content;
        const clickUpLinkPattern = /13mmuy-\d+\/13mmuy-\d+/g;
        const clickUpDocAttachment1 = /\[\]\(https:\/\/app\.clickup\.com\/\d+\/docs\/[\w-]+(\/[\w-]+)?(\?block=[\w-]+)?\)/g;
        const clickUpDocAttachment2 = /\(https:\/\/t37376862\.p\.clickup-attachments\.com\/[^\)]+\)/g;
        const clickUpDocAttachment3 = /https:\/\/clickup\.com\/[^\s)]+/g;
        const lastUpdatedDoc = savedDocuments.find(d => d.LinearDocId === getDoc.id);

        let matches = docContent.match(clickUpLinkPattern) || [];
        if (matches) {
            for (let match of matches) {
                const linkedDoc = savedDocuments.find(d => d.ClickupDocId === match);
                if (linkedDoc) {
                    const childDoc = await retryWithBackoff(()=> linearClient.document(linkedDoc.LinearDocId));
                    docContent = docContent.replace("([https://app.clickup.com/37376862/docs/"+match+"](https://app.clickup.com/37376862/docs/"+match+"))", `📌 **${childDoc.url}** 📌`);
                    await retryWithBackoff(()=> linearClient.updateDocument(getDoc.id, { content: docContent }));
                }
            }
        }
        matches = docContent.match(clickUpDocAttachment1);
        if (matches && lastUpdatedDoc) {
            lastUpdatedDoc.url = getDoc.url;
            lastUpdatedDoc.docLinked = true;
            console.log(`${lastUpdatedDoc.title} - ${lastUpdatedDoc.url}`);
        }

        matches = docContent.match(clickUpDocAttachment2);
        if (matches) {
        lastUpdatedDoc.url = getDoc.url;
        lastUpdatedDoc.fileLinked = true;
            for (let match of matches) {
                let cleanedMatch = match.replace("(", "").replace(")", "");  

                try {
                    const filePath = await downloadFile(cleanedMatch, getDoc.name);

                    if (!filePath) {
                        console.warn(`Failed to download file for match: ${cleanedMatch}`);
                        continue;
                    }

                    const fileStat = fs.statSync(filePath);
                    const fileSize = fileStat.size;
                    const fileName = path.basename(filePath);
                    const fileContentType = mime.lookup(filePath) || "application/octet-stream";

                    // Request upload URL from Linear
                    const uploadPayload = await retryWithBackoff(() => linearClient.fileUpload(fileContentType, fileName, fileSize));

                    if (!uploadPayload.success || !uploadPayload.uploadFile) {
                        throw new Error("Failed to request upload URL");
                    }

                    const uploadUrl = uploadPayload.uploadFile.uploadUrl;
                    const assetUrl = uploadPayload.uploadFile.assetUrl;

                    // Prepare headers for upload
                    const headers = new Headers();
                    headers.set("Content-Type", fileContentType);
                    headers.set("Cache-Control", "public, max-age=31536000");

                    // Add additional headers if available
                    uploadPayload.uploadFile.headers?.forEach(({ key, value }) => headers.set(key, value));

                    // Upload the file
                    const fileBuffer = fs.readFileSync(filePath);
                    const response = await fetch(uploadUrl, {
                        method: "PUT",
                        headers,
                        body: fileBuffer
                    });

                    if (!response.ok) {
                        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
                    }

                    // Replace the match with the uploaded file's asset URL
                    docContent = docContent.replace(`[${fileName}]`+match, `[${fileName}](${assetUrl})`);

                    // Update the document in Linear
                    await retryWithBackoff(() => linearClient.updateDocument(getDoc.id, { content: docContent }));

                    console.log("Upload successful:", getDoc.url);
                } catch (error) {
                    console.error("Error processing match:", cleanedMatch, error);
                }
            }
        }
        const clickUpDocAttachment4 = /https:\/\/app\.clickup\.com\/[^\s)]+/g;
        matches = docContent.match(clickUpDocAttachment4);
        if (matches && lastUpdatedDoc) {
            lastUpdatedDoc.url = getDoc.url;
            lastUpdatedDoc.Linked = true;
        }
        console.log(docContent)
    }
}

const saveToFile = () => {
    try {
        const filePath = path.join(DIRECTORY_PATH, "saved_documents.json");
        fs.writeFileSync(filePath, JSON.stringify(savedDocuments, null, 2), "utf8");

        const allSavedDocsPath = "/home/dg/Downloads/Linear/saved_Documents.json";
        let existingData = [];

        if (fs.existsSync(allSavedDocsPath)) {
            const fileContent = fs.readFileSync(allSavedDocsPath, "utf8");
            if (fileContent) existingData = JSON.parse(fileContent);
        }

        existingData.push(...savedDocuments);
        fs.writeFileSync(allSavedDocsPath, JSON.stringify(existingData, null, 2), "utf8");

    } catch (error) {
        console.error("Error saving file:", error);
    }
};

async function downloadFile(fileUrl, downloadDir = "./downloads/",name) {
    try {
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        const fileName = path.basename(new URL(fileUrl).pathname);
        const filePath = path.join(downloadDir, fileName);

        const response = await axios.get(fileUrl, { responseType: "stream" });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        console.log(`File downloaded successfully: ${filePath}`);
        return filePath; // Return file path for further processing

    } catch (error) {
        console.error(`Failed to download file from ${name}:`, error.message);
        return null;
    }
}

main();
